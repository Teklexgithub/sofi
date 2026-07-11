from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import datetime


from .models import EmployeeProfile, EmployeeLedgerEntry, PayslipRun
from .serializers import EmployeeProfileSerializer, EmployeeLedgerEntrySerializer, PayslipRunSerializer

# Import your existing shortage ledger model across app domains
from sales.models import ManagerShortageLedger




class EmployeeProfileViewSet(viewsets.ModelViewSet):
    queryset = EmployeeProfile.objects.all().order_by('full_name')
    serializer_class = EmployeeProfileSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'phone_number']


class EmployeeLedgerEntryViewSet(viewsets.ModelViewSet):
    queryset = EmployeeLedgerEntry.objects.all().order_by('-created_at')
    serializer_class = EmployeeLedgerEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return queryset









class PayslipRunViewSet(viewsets.ModelViewSet):
    queryset = PayslipRun.objects.all().order_by('-executed_at')
    serializer_class = PayslipRunSerializer

    @action(detail=False, methods=['GET'], url_path='calculate-payroll')
    def calculate_payroll(self, request):
        """
        GET /api/employee/payslips/calculate-payroll/?employee_id=<uuid>
        Calculates accrued salary from the last payout date (or job_start_date) to today based on a 30-day cycle,
        and factors in outstanding employee advances, manual fines, and unresolved branch shortages.
        """
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({"error": "Missing employee identification parameters"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = EmployeeProfile.objects.get(id=employee_id)
        except EmployeeProfile.DoesNotExist:
            return Response({"error": "Target profile record not found"}, status=status.HTTP_444_NOT_FOUND)

        # 🌟 DYNAMIC ACCRUAL CALCULATION: Find previous payout checkpoint or fall back to job_start_date
        last_payslip = PayslipRun.objects.filter(employee=employee).order_by('-executed_at').first()
        
        if last_payslip:
            # Calculate from the day after the last payroll run
            start_calculation_date = last_payslip.executed_at.date() + datetime.timedelta(days=1)
        else:
            # First time being paid, use contract execution start date
            start_calculation_date = employee.job_start_date

        today = timezone.now().date()
        
        # Guard against edge-case calculation if executed too frequently (minimum 0 days)
        total_days_worked = max(0, (today - start_calculation_date).days + 1)

        # Apply your exact formula: (monthly_salary / 30) * elapsed days worked
        daily_rate = employee.monthly_salary / Decimal('30.00')
        calculated_gross_salary = daily_rate * Decimal(total_days_worked)

        # 1. Fetch outstanding manual advances/adjustments from the Employee ledger app
        unpaid_ledgers = EmployeeLedgerEntry.objects.filter(employee=employee, is_settled=False)
        total_advances = sum(item.amount for item in unpaid_ledgers)

        # 2. 🌟 FIXED LOOKUP: Grab all assigned shortages that haven't hit a payroll cycle yet
        unpaid_shortages = ManagerShortageLedger.objects.filter(
            employee=employee, 
            payroll_cycle_date__isnull=True
        )
        total_shortages = sum(item.shortage_amount for item in unpaid_shortages)

        total_deductions = total_advances + total_shortages
        final_net_pay = max(Decimal('0.00'), calculated_gross_salary - total_deductions)

        return Response({
            "base_salary": calculated_gross_salary, # Accrued dynamic gross earnings based on total days worked
            "monthly_salary_rate": employee.monthly_salary, # Reference base contract monthly rate
            "days_calculated": total_days_worked, # Total continuous days calculated inside this payroll run
            "calculation_start_date": start_calculation_date.strftime('%Y-%m-%d'),
            "calculation_end_date": today.strftime('%Y-%m-%d'),
            "advance_deductions": total_advances,
            "shortage_deductions": total_shortages,
            "total_deductions_applied": total_deductions,
            "final_net_cash_payout": final_net_pay
        }, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """
        POST /api/employee/payslips/
        Executes and locks a finalized salary transaction. Updates status flags inside both models atomically.
        """
        employee_id = request.data.get('employee')
        notes = request.data.get('notes', '')

        if not employee_id:
            return Response({"error": "Employee parameter specification mandatory"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                employee = EmployeeProfile.objects.select_for_update().get(id=employee_id)
            except EmployeeProfile.DoesNotExist:
                return Response({"error": "Employee target reference invalid"}, status=status.HTTP_404_NOT_FOUND)

            # 🌟 REPLICATED TRANSACTION ENGINE ACCRUAL MATH LOGIC
            last_payslip = PayslipRun.objects.filter(employee=employee).order_by('-executed_at').first()
            if last_payslip:
                start_calculation_date = last_payslip.executed_at.date() + datetime.timedelta(days=1)
            else:
                start_calculation_date = employee.job_start_date

            today = timezone.now().date()
            total_days_worked = max(0, (today - start_calculation_date).days + 1)

            daily_rate = employee.monthly_salary / Decimal('30.00')
            calculated_gross_salary = daily_rate * Decimal(total_days_worked)

            # Re-fetch outstanding liabilities securely under atomic transaction rules
            unpaid_ledgers = EmployeeLedgerEntry.objects.filter(employee=employee, is_settled=False)
            total_advances = sum(item.amount for item in unpaid_ledgers)

            # 🌟 FIXED LOOKUP: Select and lock outstanding branch floor shortages assigned to employee
            unpaid_shortages = ManagerShortageLedger.objects.select_for_update().filter(
                employee=employee, 
                payroll_cycle_date__isnull=True
            )
            total_shortages = sum(item.shortage_amount for item in unpaid_shortages)

            total_deductions = total_advances + total_shortages
            final_net_pay = max(Decimal('0.00'), calculated_gross_salary - total_deductions)

            # Append calculation interval details directly into notes field to keep a clear audit history
            audit_meta_notes = f"[Accrued: {total_days_worked} days calculation from {start_calculation_date} to {today}]. " + notes

            # Save Master Payslip Document Receipt Instance Record
            payslip = PayslipRun.objects.create(
                employee=employee,
                base_salary_snapshot=calculated_gross_salary, # True dynamic gross payout record asset
                total_deductions_applied=total_deductions,
                final_net_cash_payout=final_net_pay,
                notes=audit_meta_notes
            )

            # Flip settlement boolean flags inside Employee app ledger entry records
            if unpaid_ledgers.exists():
                payslip.settled_ledger_items.add(*unpaid_ledgers)
                unpaid_ledgers.update(is_settled=True)

            # 🌟 FIXED ACTION: Lock, timestamp, and flag shortages in the Sales app as finalized
            if unpaid_shortages.exists():
                unpaid_shortages.update(
                    is_settled_from_salary=True, # Flips the flag configuration state parameter
                    payroll_cycle_date=today     # Applies active timestamp lock to clear from outstanding balance queries
                )

            serializer = self.get_serializer(payslip)
            return Response(serializer.data, status=status.HTTP_201_CREATED)