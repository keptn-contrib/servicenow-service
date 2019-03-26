class Utils {

  logMessage(keptnContext: string, message: string) {
    console.log(JSON.stringify({
      keptnContext: keptnContext,
      keptnService: 'servicenow-service',
      logLevel: 'INFO',
      message: message,
    }));
  }
}

export { Utils };
