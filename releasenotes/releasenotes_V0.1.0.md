# Release Notes 0.1.0

This release is compatible with keptn release 0.2.0.

The service is designed to receive problem events from keptn and create incidents in ServiceNow. In this release, the service is capable of:
- create incidents in ServiceNow and assign them a specific user
- update incidents in ServiceNow once they have been resolved

To trigger these actions, the service listens to CloudEvents from type:
- sh.keptn.events.problem: When receiving this event, an incident is either created or updated.
