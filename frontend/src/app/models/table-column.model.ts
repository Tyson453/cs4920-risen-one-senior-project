export interface TableColumn {
  name: string; // column name
  dataKey?: string; // name of key of the actual data in this column
  secondDataKey?: string; // name of key of the actual data to be joined with the dataKey for this column '<dataKey> <secondDataKey>'
  position?: 'right' | 'left'; // should it be right-aligned or left-aligned?
  isSortable?: boolean; // can a column be sorted?
  isLink?: boolean; // if dataKey needs to be a link
  isDate?: boolean; // check if dataKey is a data
  hasIcon?: boolean;
  iconPath?: string;
  isNumber?: boolean;
}
