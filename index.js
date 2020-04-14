const lib = require("./lib");

module.exports.handler = async (event, context) => {
  try {
    const data = await lib.authenticate(event);
    context.succeed(data);
  } catch (err) {
    console.error(err);
    context.fail("Unauthorized");
  }
};
