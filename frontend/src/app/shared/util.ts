export default class Utils {
//Converts a date in the format "MM/DD/YYYY" to an int with a greater value the later the date
  static dateStringToInt(date: string) {
    return (
      parseInt(date.substring(6)) * 10000 +
      parseInt(date.substring(0, 2)) * 100 +
      parseInt(date.substring(3, 5))
    );
  }

  /**
   * Converts "yyyy/mm/dd" to "mm/dd/yyyy"
   * @param date string of form "yyyy/mm/dd"
   * @returns "mm/dd/yyyy"
   */
  static yyyymmddTommddyyyy(date: string) {
    return date.substring(5)+"/"+date.substring(0,4)
  }

  /**
   * Converts date object to string of "mm/dd/yyyy"
   * @param date 
   * @returns "mm/dd/yyyy"
   */
  static dateToString(date: Date) {
    let yyyy = date.getFullYear();
    let mm: string | number = date.getMonth() + 1; // Months start at 0!
    let dd: string | number = date.getDate();

    if (dd < 10) { dd = '0' + dd };
    if (mm < 10) { mm = '0' + mm };

    return mm + "/" + dd + "/" + yyyy
  }

  /**
   * Converts date object to string of "yyyy-mm-dd"
   * @param date 
   * @returns "yyyy-mm-dd"
   */
  static dateRangeString(date: Date) {
    let yyyy = date.getFullYear();
    let mm: string | number = date.getMonth() + 1; // Months start at 0!
    let dd: string | number = date.getDate();

    if (dd < 10) { dd = '0' + dd };
    if (mm < 10) { mm = '0' + mm };

    return `${yyyy}-${mm}-${dd}`
  }

  /**
   * Returns hostname of the current site (e.g. http://localhost:4200 or https://www.rocteam.work/)
   * @returns hostname of url
   */
  static getHostName() {
    return `${window.location.protocol}//${window.location.host}`
  }
}
