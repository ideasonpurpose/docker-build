const prettyHrtime = require("pretty-hrtime");

const start = process.hrtime();

const prettierHrtime = hrtime => {
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

prettierHrtime([0, 543]);
prettierHrtime([1, 0]);
prettierHrtime([1, 15e7]);
prettierHrtime([1, 5e6]);
prettierHrtime([1, 5.1e6]);
prettierHrtime([1, 1e7]);
prettierHrtime([1, 77e7]);
prettierHrtime(process.hrtime(start));
