export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const isSameYear = startDate.getFullYear() === endDate.getFullYear();
  const isSameMonth = startDate.getMonth() === endDate.getMonth();
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const monthDayFormat: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }; // August 18
  const monthDayYearFormat: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }; // August 18, 2020

  // No range, display single date: August 18, 2020
  if (isSameDay && isSameMonth && isSameYear) {
    return startDate.toLocaleDateString('en-US', monthDayYearFormat);
  }

  // Display range: August 18 - 20, 2020
  if (isSameMonth && isSameYear) {
    return startDate.toLocaleDateString('en-US', monthDayFormat) +
      ` - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }

  // Display range: August 18 - September 5, 2020
  if (isSameYear) {
    return startDate.toLocaleDateString('en-US', monthDayFormat) +
      ` - ${endDate.toLocaleDateString('en-US', monthDayYearFormat)}`;
  }

  // Display range: August 18, 2020 - February 5, 2021
  return startDate.toLocaleDateString('en-US', monthDayYearFormat) +
    ` - ${endDate.toLocaleDateString('en-US', monthDayYearFormat)}`;
};