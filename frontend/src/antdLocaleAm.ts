import enUS from 'antd/locale/en_US';
import type { Locale } from 'antd/es/locale';

// Amharic overrides for antd's own built-in component chrome (Table filters,
// empty states, Modal/Popconfirm buttons, form validation). Deep calendar
// internals (DatePicker/Calendar month names, week start, etc.) intentionally
// stay on the English base - dates are numeric either way and fully
// translating the calendar locale is a much deeper, lower-payoff rabbit hole.
const amET: Locale = {
  ...enUS,
  locale: 'am',
  global: {
    placeholder: 'እባክዎ ይምረጡ',
    close: 'ዝጋ',
  },
  Table: {
    ...enUS.Table,
    filterTitle: 'የማጣሪያ ዝርዝር',
    filterConfirm: 'እሺ',
    filterReset: 'እንደገና አስጀምር',
    filterEmptyText: 'ምንም ማጣሪያ የለም',
    emptyText: 'ምንም መረጃ የለም',
    selectAll: 'የአሁኑን ገጽ ምረጥ',
    selectNone: 'ሁሉንም መረጃ አጽዳ',
    sortTitle: 'መደርደር',
    triggerDesc: 'ለመቀነስ ደርድር ጠቅ ያድርጉ',
    triggerAsc: 'ለመጨመር ደርድር ጠቅ ያድርጉ',
    cancelSort: 'መደርደርን ለመሰረዝ ጠቅ ያድርጉ',
  },
  Modal: {
    ...enUS.Modal,
    okText: 'እሺ',
    cancelText: 'ይቅር',
    justOkText: 'እሺ',
  },
  Popconfirm: {
    ...enUS.Popconfirm,
    okText: 'እሺ',
    cancelText: 'ይቅር',
  },
  Empty: {
    description: 'ምንም መረጃ የለም',
  },
  Form: {
    ...enUS.Form,
    optional: '(አማራጭ)',
  } as Locale['Form'],
  Text: {
    ...enUS.Text,
    edit: 'አርትዕ',
    copy: 'ቅዳ',
    copied: 'ተቀድቷል',
    expand: 'ዘርጋ',
    collapse: 'ሰብስብ',
  },
};

export default amET;
