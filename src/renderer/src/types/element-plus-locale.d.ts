declare module 'element-plus/dist/locale/zh-cn.mjs' {
  interface ElementPlusLocale {
    name: string;
    el: {
      colorpicker: Record<string, string>;
      datepicker: Record<string, string>;
      dialog: Record<string, string>;
      form: Record<string, string>;
      message: Record<string, string>;
      messagebox: Record<string, string>;
      select: Record<string, string>;
      table: Record<string, string>;
      [key: string]: any;
    };
  }

  const locale: ElementPlusLocale;
  export default locale;
} 