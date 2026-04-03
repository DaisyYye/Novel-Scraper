export function formatRelativeDate(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutesDiff = Math.round((date.getTime() - Date.now()) / 60000);

  if (Math.abs(minutesDiff) < 60) {
    return relativeFormatter.format(minutesDiff, "minute");
  }

  const hoursDiff = Math.round(minutesDiff / 60);
  if (Math.abs(hoursDiff) < 24) {
    return relativeFormatter.format(hoursDiff, "hour");
  }

  const daysDiff = Math.round(hoursDiff / 24);
  if (Math.abs(daysDiff) < 7) {
    return relativeFormatter.format(daysDiff, "day");
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
