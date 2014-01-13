var settings = {};
settings.env = process.env.NODE_ENV || "development";

settings.appname = "Shaping Vocal Response Amplitudes"
settings.port = process.env.VCAPP_APP_PORT || 3333;

exports = module.exports = settings;