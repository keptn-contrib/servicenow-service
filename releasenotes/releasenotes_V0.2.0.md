# Release Notes 0.2.0

This release is compatible with Keptn release 0.6.0.

The service is designed to receive problem events from keptn and create incidents in ServiceNow. In this release, the service is capable of:

- create/upodate events and alerts in ServiceNow and assign them a specific user

To trigger these actions, the service listens to CloudEvents from type:

- sh.keptn.event.problem.open: When receiving this event, an alert is either created or updated
