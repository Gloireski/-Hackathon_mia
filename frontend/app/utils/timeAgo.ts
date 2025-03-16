import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr"; // Import your desired language

dayjs.extend(relativeTime);

export function timeAgo(timestamp: string, locale='en'): string {
  return dayjs(timestamp).locale(locale).fromNow();
}
