config = {
	"verbose": true,
	"synOwnElmtType": "SynopticID",
	"keycloakAuth": "http://localhost/auth/",
	"srvSrcReq": "synopticserver",
	"synSvg": "http://localhost/dashboardSmartCity/img/synoptics/{0}.svg",
	"getOneKpiValue": "http://localhost/mypersonaldata/api/v1/kpidata/{0}/values?last=1&accessToken={1}&sourceRequest={2}&sourceId={3}",
	"getOnePublicKpiValue": "http://localhost/mypersonaldata/api/v1/public/kpidata/{0}/values?sourceRequest={1}&sourceId={2}",
	"getOneSensorValue": "http://localhost/ServiceMap/api/v1/?serviceUri={0}&valueName={1}&accessToken={2}",
	"getOnePublicSensorValue": "http://localhost/ServiceMap/api/v1/?serviceUri={0}&valueName={1}",
	"setValue": "http://localhost/datamanager/api/v1/kpidata/{0}/values?accessToken={1}&sourceRequest={2}&sourceId={3}",
	"getDashboardData": "http://localhost/dashboardSmartCity/management/getDashboardData.php?dashboardId={0}"
};