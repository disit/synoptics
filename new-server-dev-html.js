app.get('/v2/synoptic/', function (req, res) {  
  res.send(`<!DOCTYPE html>
<html>
	<head>
		<title>Synoptic</title>
		<script src="/synoptics/socket.io/socket.io.js"></script>
		<script src="https://code.jquery.com/jquery-1.11.1.js"></script>
		<script src="https://www.snap4city.org/mypersonaldata/js/lib/keycloak.js"></script>
		<script src="../jsonpath-0.8.0.js"></script>
		<script src="../socket.io.worker.js"></script>
		<script src="../zoomHandler.js"></script>
		<script>				
			var doSecure = function() {
				var siow = null;
				var kk = null;
				var xhr = new XMLHttpRequest();
				xhr.open('GET', '../new-config.js', true);
				xhr.onload = function() {
					eval(xhr.response);
					kk = Keycloak({
						"realm": "master",
						"url": config["keycloakAuth"],
						"clientId": "js-synoptic-client"						
					});
					kk.init({
						onLoad: 'check-sso',
						checkLoginIframe: false
					}).success(
						function (authenticated) {
							if (authenticated) {											
									siow = new SIOW( 
										{ 
											"connPath": "/synoptics/socket.io",
											"accessToken": kk.token,
											"queryString": "?id={0}{1}"
										}, 
										function() { 
											console.log("SIOW ERROR!");
										} 
									);
									siow.start();	
									var decodeToken = function(str) {
										str = str.split('.')[1];
										str = str.replace('/-/g', '+');
										str = str.replace('/_/g', '/');
										switch (str.length % 4) { case 0: break; case 2: str += '=='; break; case 3: str += '='; break; default: throw 'Invalid token'; }
										str = (str + '===').slice(0, str.length + (str.length % 4));
										str = str.replace(/-/g, '+').replace(/_/g, '/');
										str = decodeURIComponent(escape(atob(str)));
										str = JSON.parse(str);
										return str;
									};								
									var updToken = setInterval(function(){									
										try {
											kk.updateToken(-1).success(function(response) {
												siow.setToken(kk.token);
											}).error(function(err) {
												setTimeout(function(){  window.location.href = "?id={2}{3}"; }, 2000*Math.random() );
											});
										}
										catch(rte) {
											setTimeout(function(){  window.location.href = "?id={4}{5}"; }, 2000*Math.random() );
										}
									},1000*( parseInt(decodeToken(kk.token)['exp']) - Math.ceil(new Date().getTime() / 1000) + kk.timeSkew ));
								
							} else {
								kk.login();
							}
						}
					).error(
						function () {
							setTimeout(function(){ window.location.href = "?id={6}{7}"; }, 2000*Math.random() );
						}
					);
				};
				xhr.send();				
			};		
			$(function() {			
				var siow = null;
				var xhre = new XMLHttpRequest();
				xhre.open('GET', '../new-config.js', true);
				xhre.onload = function() {
					eval(xhre.response);
					var iddasboard = null;
					if(document.referrer) document.referrer.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) { if(key == "iddasboard") iddasboard = window.atob(value); });
					if(iddasboard) {
						var xhr = new XMLHttpRequest();
						`.format(req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:"",
			req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:"",
			req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:"",
			req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:"",
			req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:"")+
			'xhr.open("GET", config["getDashboardData"].replace("{0}",iddasboard), true);'+
						`
						xhr.onload = function() { 
							if(JSON.parse(xhr.response).visibility == "public") {
								siow = new SIOW( 
									{ 
										"connPath": "/synoptics/socket.io", 
										"queryString": "?id={0}{1}"
									}, 
									function(){doSecure();} 
								).start();
							}
							else {
								doSecure();
							}
						};
						xhr.send();
					}
					else {
						siow = new SIOW( 
							{ 
								"connPath": "/synoptics/socket.io", 
								"queryString": "?id={2}{3}"
							}, 
							function(){doSecure();} 
						).start();	
					}
				};
				xhre.send();				
			}); 
			
		</script>
	</head>
	<body></body>
</html>`.format(req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:"",
			req.query.id,req.query.logLevel?"&logLevel="+req.query.logLevel:""));
});