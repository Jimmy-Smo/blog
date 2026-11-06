/** 文章日历日期统一使用台北时区，排序使用完整时间戳。 */
export const SITE_TIME_ZONE = 'Asia/Taipei';

const formatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: SITE_TIME_ZONE,
	year: 'numeric', month: '2-digit', day: '2-digit',
	hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** @param {Date} date */
function parts(date) {
	return Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

/** @param {Date} date */
export function formatPostDate(date) {
	const p = parts(date);
	return `${p.year}-${p.month}-${p.day}`;
}

/** 新文章记录到秒，并显式保留 +08:00，避免依赖运行构建的机器时区。
 * @param {Date} [date]
 */
export function postTimestamp(date = new Date()) {
	const p = parts(date);
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
}

/** 同一时刻的文章按 ID 稳定排序，不伪造同批发布时间的先后。
 * @param {Date} a
 * @param {Date} b
 * @param {string} aId
 * @param {string} bId
 */
export function comparePostDates(a, b, aId, bId) {
	return b.valueOf() - a.valueOf() || (aId < bId ? -1 : aId > bId ? 1 : 0);
}
