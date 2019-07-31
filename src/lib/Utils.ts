class Utils {

  logMessage(keptnContext: string, eventId: string, message: string, logLevel: string = 'INFO') {
    console.log(JSON.stringify({
      keptnContext: keptnContext,
      eventId,
      keptnService: 'servicenow-service',
      timestamp: Date.now(),
      logLevel,
      message: message,
    }));
  }
}

export { Utils };
