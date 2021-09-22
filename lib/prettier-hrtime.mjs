import prettyHrtime from "pretty-hrtime";

export const prettierHrtime = (hrtime) => {
  let timeString;
  const seconds = hrtime[1] > 5e6 ? " seconds" : " second";
  if (hrtime[0] > 60) {
    timeString = prettyHrtime(hrtime, { verbose: true })
      .replace(/\d+ (milli|micro|nano)seconds/gi, "")
      .trim();
  } else if (hrtime[1] > 5e6) {
    timeString = prettyHrtime(hrtime).replace(/ s$/, seconds);
  } else {
    timeString = prettyHrtime(hrtime);
  }
  return timeString;
};
