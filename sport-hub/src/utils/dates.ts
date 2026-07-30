export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const isSameYear = startDate.getFullYear() === endDate.getFullYear();
  const isSameMonth = startDate.getMonth() === endDate.getMonth();
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const monthDayFormat: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }; // August 18
  const monthDayYearFormat: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }; // August 18, 2020

  // No range, display single date: 18 August, 2020
  if (isSameDay && isSameMonth && isSameYear) {
    return startDate.toLocaleDateString('en-GB', monthDayYearFormat);
  }

  // Display range: 18 - 20 August, 2020
  if (isSameMonth && isSameYear) {
    return startDate.getDate() +
      ` - ${endDate.toLocaleDateString('en-GB', monthDayFormat)}, ${endDate.getFullYear()}`;
  }

  // Display range: 18 August - 5 September, 2020
  if (isSameYear) {
    return startDate.toLocaleDateString('en-GB', monthDayFormat) +
      ` - ${endDate.toLocaleDateString('en-GB', monthDayYearFormat)}`;
  }

  // Display range: 18 August, 2020 - 5 February, 2021
  return startDate.toLocaleDateString('en-GB', monthDayYearFormat) +
    ` - ${endDate.toLocaleDateString('en-GB', monthDayYearFormat)}`;
};

export const formatDateRangeShort = (startDate: Date, endDate: Date): string => {
  const isSameMonth = startDate.getMonth() === endDate.getMonth();
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const shortDateFormat: Intl.DateTimeFormatOptions = { dateStyle: "short" };

  // No range, display single date: 18/08/20
  if (isSameDay && isSameMonth) {
    return startDate.toLocaleDateString('en-GB', shortDateFormat);
  }

  // Display range: 18-20/08/20
  if (isSameMonth) {
    const formattedStartDate = startDate.getDate() < 10
      ? '0' + startDate.getDate()
      : startDate.getDate();
    return formattedStartDate +
      `-${endDate.toLocaleDateString('en-GB', shortDateFormat)}`;
  }

  // Display range: 18/08/20 - 05/09/20
  return startDate.toLocaleDateString('en-GB', shortDateFormat) +
    ` - ${endDate.toLocaleDateString('en-GB', shortDateFormat)}`;
};

// Formats to DD/MM/YYYY, returns empty string if invalid date
export const formatDate = (dateStr: string) =>{
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
  } catch {
    return dateStr;
  }
}