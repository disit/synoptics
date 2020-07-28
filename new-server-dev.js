/* 	Synoptics.
	Copyright (C) 2019 DISIT Lab http://www.disit.org - University of Florence

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>. */

var express = require('express');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var fs = require("fs");
var privateKey = fs.readFileSync("key.pem","utf8");
var certificate = fs.readFileSync("cert.pem","utf8");
var credentials = { key: privateKey, cert: certificate };
var https = require('https').createServer(credentials,app);
var io = require('socket.io')(https);
var mysql = require('mysql');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var kafka = require('kafka-node');
var xmlparser = require('fast-xml-parser');
eval(fs.readFileSync('new-config.js')+'');
var sourceRequest = config["srvSrcReq"];
var sourceId = config["srvSrcReq"];		

String.prototype.format = function() {
	a = this;
	for (k in arguments) {
		a = a.replace("{" + k + "}", arguments[k]);
	}
	return a;
};

String.prototype.toKafkaTopic = function() {
	str = this;
	str = str.split(" ").join("_").replace(/[^\w\.-]/g,'').substr(0,249);
	return str;
}

var logSummary = function(dt,skt,txt) {
	try {
		var dd = dt.getDate();
		var mm = dt.getMonth()+1; 
		var yyyy = dt.getFullYear();
		if(dd<10) dd='0'+dd;
		if(mm<10) mm='0'+mm; 
		var hh = dt.getHours();
		var ss = dt.getMinutes();
		var ii = dt.getSeconds();
		return yyyy+'-'+mm+'-'+dd+' '+hh+':'+ss+':'+ii+' '+skt+' '+txt;
	}
	catch(e) {
		console.log(">> LOG ERROR >>>>>>>>>>>>>>>>>");
		console.log("Summary: LOG ERROR UNABLE TO BUILD SUMMARY");
		console.log("Time: "+new Date().toString());
		console.log("Error: Unable to build log summary using:");
		console.log("dt = "+dt.toString());
		console.log("skt = "+skt);
		console.log("txt = "+txt);
		return "none";
	}
};

var notifyBroker = function(obj,socketid){ // this function is called for delivering to Kafka updates of variable values, as a result of a write event that a client has raised on this socket server
		
	if(config["verbose"]) {		
		console.log(">> SOCKET SERVER -> KAFKA | CONNECTING... >>>>>>>");
		console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA CONNECTING TO "+config["kafka"]["endpoint"]));
		console.log("Time: "+new Date().toString());
		console.log("Socket: "+socketid);
		if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
		console.log("Connecting to Kafka broker at "+config["kafka"]["endpoint"]);
		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
	}
	var client = new kafka.KafkaClient({ kafkaHost: config["kafka"]["endpoint"] });
	var Producer = kafka.Producer;
	var producer = new Producer(client, {requireAcks: 1});
	producer.on('ready', function () {
		if(config["verbose"]) {
			console.log(">> SOCKET SERVER -> KAFKA | CREATING TOPIC... >>>>>>>");
			console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA CREATING TOPIC "+obj.event.toKafkaTopic()));
			console.log("Time: "+new Date().toString());
			console.log("Socket: "+socketid);
			if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
			console.log("Creating topic "+obj.event.toKafkaTopic());
			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
		}
		producer.createTopics([obj.event.toKafkaTopic()], true, function (errToCreateTopic, topicCreated) {
			if (!errToCreateTopic) {
				if(config["verbose"]) {
					console.log(">> SOCKET SERVER -> KAFKA | SENDING MESSAGE... >>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA SENDING MESSAGE TO TOPIC "+obj.event.toKafkaTopic()));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socketid);
					if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
					console.log("On this topic: "+obj.event.toKafkaTopic());
					console.log("Sending this message:");
					console.log(JSON.stringify(obj));
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}					
				producer.send([{
					topic: obj.event.toKafkaTopic(), partition: 0, messages: [JSON.stringify(obj)], attributes: 0
				}], function (err, result) {
					if (err) {
						console.log(">> SOCKET SERVER -> KAFKA | ERROR >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA ERROR SENDING MESSAGE"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socketid);
						if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
						console.log("Attempted sending this:");
						console.log(obj);
						console.log("with this topic:");
						console.log(obj.event.toKafkaTopic());
						console.log("Obtained this error:");
						console.log(err);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
					else {
						if(config["verbose"]) {
							console.log(">> SOCKET SERVER -> KAFKA | SEND OK >>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA SEND OK TO TOPIC "+obj.event.toKafkaTopic()));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socketid);
							if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
							console.log("Successfully sent this:");
							console.log(obj);
							console.log("with this topic:");
							console.log(obj.event.toKafkaTopic());
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}	
				});
			} else {
				console.log(">> SOCKET SERVER -> KAFKA | ERROR >>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA ERROR COULD NOT TO CREATE TOPIC "+obj.event.toKafkaTopic()));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socketid);
				if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
				console.log("Attempted sending this:");
				console.log(obj);
				console.log("with this topic:");
				console.log(obj.event.toKafkaTopic());
				console.log("Error:");
				console.log("It was not possible to create topic \""+obj.event+"\", the socket server says.");
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");                
			}
		});        
	});

	producer.on('error', function (err) {
		console.log(">> SOCKET SERVER -> KAFKA | ERROR >>>>>>>");
		console.log("Summary: "+logSummary(new Date(),socketid,"SOCKET SERVER TO KAFKA ERROR SENDING MESSAGE"));
		console.log("Time: "+new Date().toString());
		console.log("Socket: "+socketid);
		if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
		console.log("Attempted sending this:");
		console.log(obj);
		console.log("with this topic:");
		console.log(obj.event.toKafkaTopic());
		console.log("Obtained this error:");
		console.log(err);
		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
	});
	
}

var listenBroker = function(topic) {
	try { 
		topic = topic.toKafkaTopic();
		if( ( !ksbs[topic] ) || ksbs[topic]["error"] ) {
			ksbs[topic] = {};
			if(config["verbose"]) {
				console.log(">> SOCKET SERVER -> KAFKA | CONNECTING... >>>>>>>");				
				console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA CONNECTING TO "+config["kafka"]["endpoint"]));
				console.log("Time: "+new Date().toString());
				console.log("Connecting to Kafka broker at "+config["kafka"]["endpoint"]);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
			}
			ksbs[topic]["client"] = new kafka.KafkaClient({ kafkaHost: config["kafka"]["endpoint"] });
			
			var Offset = kafka.Offset;
			var offset = new Offset(ksbs[topic]["client"]);
			offset.fetchLatestOffsets([topic], (err, data) => {
				try {
					var startFrom = null;
					if(err || !data[topic]){
						console.log(">> SOCKET SERVER -> KAFKA | OFFSET ERROR >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA ERROR COULD NOT GET OFFSET FOR TOPIC "+topic));
						console.log("Time: "+new Date().toString());
						console.log("Failed to get offsets of topic: " + topic + "; " + err);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
					else { 			
						startFrom = data[topic]["0"];
						if(config["verbose"]) {
							console.log(">> SOCKET SERVER -> KAFKA | OFFSET >>>>>>>");
							console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA CURRENT OFFSET IS "+startFrom+" FOR TOPIC "+topic));
							console.log("Time: "+new Date().toString());
							console.log("Last offset for topic " + topic + " is "+startFrom);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					var Consumer = kafka.Consumer;
					if(config["verbose"]) {
						console.log(">> SOCKET SERVER -> KAFKA | SUBSCRIPTION >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA SUBSCRIBING TO "+topic));
						console.log("Time: "+new Date().toString());
						console.log("Message: I am now going to subscribe for "+topic);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
					if(startFrom) ksbs[topic]["consumer"] = new Consumer( ksbs[topic]["client"], [ { topic: topic, offset: startFrom } ], { autoCommit: false, fromOffset: true } );
					else ksbs[topic]["consumer"] = new Consumer( ksbs[topic]["client"], [ { topic: topic } ], { autoCommit: false } );
					ksbs[topic]["consumer"].on('message', function (message) {
						try {					
							if(config["verbose"]) {
								console.log(">> KAFKA -> SOCKET SERVER | RECEIVED MESSAGE >>>>>>>");
								console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER RECEIVED MESSAGE"));
								console.log("Time: "+new Date().toString());
								console.log("Message: ");
								console.log(message);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
							var obj = JSON.parse(message["value"]);
							if(obj["serviceUri"]) {
								var id = obj["serviceUri"]+" "+obj["value_name"];
								if(!sens[id]) {
									sens[id] = { 
										id: id,
										value: obj.value?obj.value:obj.value_str?obj.value_str:JSON.stringify(obj.value_obj), 
										timestamp: new Date(obj.date_time).getTime(), 
										subscriptions: {}
									}; 
								}
								else {
									sens[id]["value"] = obj.value?obj.value:obj.value_str?obj.value_str:JSON.stringify(obj.value_obj);
									sens[id]["timestamp"] = new Date(obj.date_time).getTime();
								}
								Object.keys(sens[id]["subscriptions"]).forEach(function(socketid){
									try {							
										if(sens[id]["subscriptions"][socketid]["isActive"] && sens[id]["subscriptions"][socketid]["isAuthorized"]) {
											var lastValue = sens[id]["value"];
											try { lastValue = JSON.parse(lastValue); } catch(me) {}
											io.in(socketid).emit("update "+id, JSON.stringify({ 
												event: "update "+id,
												id: id, 
												lastValue: lastValue, 
												timestamp: sens[id]["timestamp"]
											}, (k, v) => v === undefined ? null : v)); 
											if(config["verbose"]) {
												console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERED FOR "+id));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socketid);
												if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
												console.log({ 
													event: "update "+id,
													id: id, 
													lastValue: sens[id]["value"],  
													timestamp: sens[id]["timestamp"]
												});
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										}
									}
									catch(e) {
										console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERY ERROR FOR "+id));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socketid);
										if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
										console.log("Error: it was not possible to deliver the below object to the above addressee");
										console.log({ 
											event: "update "+id,
											id: id, 
											lastValue: sens[id]["value"], 
											timestamp: sens[id]["timestamp"]
										});
										console.log("The occurred exception follows: ");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										return;
									}
								});
								ksbs[topic]["consumer"].commit(function(err, data) {
									if(err) {
										console.log(">> SOCKET SERVER -> KAFKA | COMMIT ERROR >>>>>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA COMMIT ERROR"));
										console.log("Time: "+new Date().toString());
										console.log("What happened: it was not possible to notify Kafka that the message has been consumed.");
										console.log("Callback error:");
										console.log(err);
										console.log("Callback data:");
										console.log(data);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										return;
									}
									else {
										if(config["verbose"]) {
											console.log(">> SOCKET SERVER -> KAFKA | COMMIT OK >>>>>>>>>>>>>>");
											console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA COMMIT OK"));
											console.log("Time: "+new Date().toString());
											console.log("What: Kafka has been correctly notified of the successful consumption of the following:");
											console.log(data);
											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
									}
								});
							}
							else if(obj["kpiId"]) {
								var id = obj["kpiId"];
								if(!kpis[id]) return;
								kpis[id]["value"] = obj["value"];
								kpis[id]["timestamp"] = obj["dataTime"];								
								Object.keys(kpis[id]["subscriptions"]).forEach(function(socketid){
									try {							
										if(kpis[id]["subscriptions"][socketid]["isActive"] && kpis[id]["subscriptions"][socketid]["isAuthorized"]) {
											var lastValue = kpis[id]["value"];
											try { lastValue = JSON.parse(lastValue); } catch(me) {}
											io.in(socketid).emit("update "+id, JSON.stringify({ 
												event: "update "+id,
												id: id, 
												lastValue: lastValue, 
												timestamp: kpis[id]["timestamp"]
											}, (k, v) => v === undefined ? null : v)); 
											if(config["verbose"]) {
												console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERED FOR "+id));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socketid);
												if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
												console.log({ 
													event: "update "+id,
													id: id, 
													lastValue: kpis[id]["value"],  
													timestamp: kpis[id]["timestamp"]
												});
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										}
									}
									catch(e) {
										console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERY ERROR FOR "+id));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socketid);
										if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
										console.log("Error: it was not possible to deliver the below object to the above addressee");
										console.log({ 
											event: "update "+id,
											id: id, 
											lastValue: kpis[id]["value"], 
											timestamp: kpis[id]["timestamp"]
										});
										console.log("The occurred exception follows: ");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										return;
									}
								});
								ksbs[topic]["consumer"].commit(function(err, data) {
									if(err) {
										console.log(">> SOCKET SERVER -> KAFKA | COMMIT ERROR >>>>>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA COMMIT ERROR"));
										console.log("Time: "+new Date().toString());
										console.log("What happened: it was not possible to notify Kafka that the message has been consumed.");
										console.log("Callback error:");
										console.log(err);
										console.log("Callback data:");
										console.log(data);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										return;
									}
									else {
										if(config["verbose"]) {
											console.log(">> SOCKET SERVER -> KAFKA | COMMIT OK >>>>>>>>>>>>>>");
											console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA COMMIT OK"));
											console.log("Time: "+new Date().toString());
											console.log("What: Kafka has been correctly notified of the successful consumption of the following:");
											console.log(data);
											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
									}
								});								
							}
						}
						catch(e) {
							console.log(">> KAFKA -> SOCKET SERVER | ERROR >>>>>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER ERROR"));
							console.log("Time: "+new Date().toString());
							console.log("Error: something wrong happened while consuming message from Kafka.");
							console.log("Exception object:");
							console.log(e);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							return;
						}				
					});		
					ksbs[topic]["consumer"].on('error', function (err) {
						console.log(">> KAFKA -> SOCKET SERVER | ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Error:");
						console.log(err);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");						
						try {
							if('The topic(s) '+topic+' do not exist' == err["message"]) {
								var c = new kafka.KafkaClient({ kafkaHost: config["kafka"]["endpoint"] });
								var P = kafka.Producer;
								var p = new P(c, {requireAcks: 1});
								p.on('ready', function () {
									try {
										p.createTopics([topic], true, function (errToCreateTopic, topicCreated) {
											try {
												if(!errToCreateTopic) {
													console.log(">> KAFKA -> SOCKET SERVER | ERROR HANDLED SUCCESSFULLY >>>>>>>>>>>>>>>>>");
													console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER RESUMED FROM ERROR CREATING TOPIC "+topic));
													console.log("Time: "+new Date().toString());
													console.log("The new topic "+topic+" was successfully created.");
													console.log("I am now going to subscribe to the topic");
													console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
													ksbs[topic]["error"] = true;
													listenBroker(topic);
												}
												else {
													console.log(">> KAFKA -> SOCKET SERVER | ERROR >>>>>>>>>>>>>>>>>");
													console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER COULD NOT RESUME FROM ERROR CREATING TOPIC "+topic));
													console.log("Time: "+new Date().toString());
													console.log("... and the attempt of creating the topic "+topic+" failed.");
													console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
												}
											}
											catch(e) {
												console.log(">> KAFKA -> SOCKET SERVER | EXCEPTION >>>>>>>>>>>>>>>>>");
												console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER COULD NOT RESUME FROM ERROR CREATING TOPIC "+topic));
												console.log("Time: "+new Date().toString());
												console.log("... and the attempt of creating the topic "+topic+" failed due to the following exception:");
												console.log(e);
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										});
									}
									catch(e) {
										console.log(">> KAFKA -> SOCKET SERVER | EXCEPTION >>>>>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER COULD NOT RESUME FROM ERROR CREATING TOPIC "+topic));
										console.log("Time: "+new Date().toString());
										console.log("... and the attempt of creating the topic "+topic+" failed due to the following exception:");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								});
							}
						}
						catch(e) {
							console.log(">> KAFKA -> SOCKET SERVER | EXCEPTION >>>>>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),"--","KAFKA TO SOCKET SERVER COULD NOT RESUME FROM ERROR CREATING TOPIC "+topic));
							console.log("Time: "+new Date().toString());
							console.log("... and the attempt of creating the topic "+topic+" failed due to the following exception:");
							console.log(e);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						return;
					});	
				
				}
				catch(e) {
					console.log(">> SOCKET SERVER -> KAFKA | ERROR >>>>>>>");
					console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA ERROR"));
					console.log("Time: "+new Date().toString());
					console.log(e);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					return;
				}
				
			});
			
		}
	}
	catch(e) {
		console.log(">> SOCKET SERVER <-> KAFKA | ERROR >>>>>>>");
		console.log("Summary: "+logSummary(new Date(),"--","SOCKET SERVER TO KAFKA ERROR"));
		console.log("Time: "+new Date().toString());
		console.log(e);
		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
		return;
	}
	
}

app.use("/", express.static(__dirname ));

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

var vars = {};
var sens = {};
var kpis = {};
var tkns = {};
var syns = {};
var clni = {};
var ksbs = {};
var shared = {};

io.on("connection", function(socket){ 		
		
	try {
		
		socket.join(socket.id);
		
		if(config["verbose"]) {
			console.log(">> CONNECTION OK >>>>>>>>>>>>>");
			console.log("Summary: "+logSummary(new Date(),socket.id,"CONNECTED"));
			console.log("Time: "+new Date().toString());
			console.log("Socket: "+socket.id);
			if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
		}
		
		socket.on("display", function(data) { // it provides back synoptic metadata so that the client could actually build and display the synoptic			
			syns[socket.id] = { loading: true };
			try {							
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: display >>>>>>><<<<>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUESTED DISPLAY "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: display");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				// Since June 2020, when a synoptic is created, a copy of its SVG template is built and used only for the newly created template.
				// We then check in first if this synoptic-specific SVG file is available. 
				var xmlHttpTpl = new XMLHttpRequest();
				xmlHttpTpl.open( "GET", config["synSvg"].format(data), true); 
				if(config["verbose"]) {
					console.log(">> HTTP REQUEST >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"HTTP REQUEST SYNOPTIC-SPECIFIC TEMPLATE FOR SYNOPTIC "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("URL: "+config["synSvg"].format(data));
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				xmlHttpTpl.onreadystatechange = function() {	
					try {
						if(xmlHttpTpl.readyState < 4) return;
						if(config["verbose"]) {
							console.log(">> HTTP RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"HTTP RESPONSE "+xmlHttpTpl.status+" TO REQUEST SYNOPTIC-SPECIFIC TEMPLATE"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Status: "+xmlHttpTpl.status)
							console.log("Full SVG template omitted");
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						var template = null;
						var mappings = null;						
						var validTpl = false;
						try {
							validTpl = xmlparser.validate(xmlHttpTpl.responseText) === true && xmlHttpTpl.responseText.includes("data-siow");
						}
						catch(ee) {
							console.log(">> SYNOPTIC-SPECIFIC TEMPLATE VALIDATION ERROR >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"SYNOPTIC-SPECIFIC TEMPLATE VALIDATION ERROR"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Synoptic-specific template validation failed. The generic template will be used. The error follows:");
							console.log(ee)
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							validTpl = false;
						}
						if(xmlHttpTpl.status == 200 && validTpl) { // if the synoptic-specific template is available
							template = config["synSvg"].format(data);
						}
						connection.query(
							'select t.path template from synoptics s join templates t on s.template_id = t.id where s.id = '+parseInt(data), 
							function (error, results, fields) { 
								try { 
									if(!template) {
										if ( (!error) && results.length > 0) { 
											template = results[0].template; 
										}
										else {
											console.log(">> DISPLAY ERROR >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("Payload: "+data);
											console.log("Error: nor the synoptic-specific SVG neither the generic path to the SVG template could be located for this synoptic");
											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"Nor the synoptic-specific SVG neither the generic path to the SVG template could be located for this synoptic."}, (k, v) => v === undefined ? null : v)); 
											socket.disconnect();
											return;
										}
									}
									connection.query( // after having retrieved the template, we retrieve variable mappings
										'select m.* from mappings m join synoptics s on m.synoptic_id = s.id where s.id = '+data, 
										function (error, results, fields) {
											try {
												if (!error) {
													mappings = {};
													mappings["input"] = {};
													mappings["output"] = {};
													for(var r = 0; r < results.length; r++) {
														mappings[results[r].tpl_var_role][results[r].tpl_var_name] = results[r].usr_var_name;	
													}
												}
												else {
													console.log(">> DISPLAY ERROR >>>>>>>");
													console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
													console.log("Time: "+new Date().toString());
													console.log("Socket: "+socket.id);
													if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
													console.log("Payload: "+data);
													console.log("MySQL query: ");
													console.log('select m.* from mappings m join synoptics s on m.synoptic_id = s.id where s.id = '+data);
													console.log("Error: database error, query for variable mappings failed");
													console.log("The error returned by MySQL is:");
													console.log(error);
													console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
													io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"Database error"}, (k, v) => v === undefined ? null : v)); 
													socket.disconnect();
													return;
												}
												
												// after having retrieved synoptic metadata, we check if the requester is authorized to actually get them back
												
												if(tkns[socket.id]) { // if the requester is authenticated (i.e. if she has already submitted her access token through the authenticate event)

													// we check to see if she is the owner of the synoptic
													var xmlHttpAuth11 = new XMLHttpRequest();
													xmlHttpAuth11.open( "GET", config["ownershipApi"].format(config["synOwnElmtType"],tkns[socket.id]["token"],data), true);
													if(config["verbose"]) {
														console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
														console.log("Summary: "+logSummary(new Date(),socket.id,"OWNERSHIP API CALL FOR "+data));
														console.log("Time: "+new Date().toString());
														console.log("Socket: "+socket.id);
														if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
														if(tkns[socket.id]) console.log("URL: "+config["ownershipApi"].format(config["synOwnElmtType"],tkns[socket.id]["token"],data));
														console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
													}
													xmlHttpAuth11.onreadystatechange = function() {							
														try {
															if(xmlHttpAuth11.readyState < 4) return;
															if(config["verbose"]) {
																console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																console.log("Summary: "+logSummary(new Date(),socket.id,"OWNERSHIP API RESPONSE "+xmlHttpAuth11.status));
																console.log("Time: "+new Date().toString());
																console.log("Socket: "+socket.id);
																if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																console.log("Status: "+xmlHttpAuth11.status)
																console.log(xmlHttpAuth11.responseText);
																console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
															}
															if(xmlHttpAuth11.status == 200) {
																var responseJson11 = JSON.parse(xmlHttpAuth11.responseText);
																var isOwner = false;
																responseJson11.forEach(function(ownElmt11){
																	try {
																		if(ownElmt11.elementId == data) {	// if she is the owner, we provide synoptic metas back
																			syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:true, loading: false };		
																			io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:true}, (k, v) => v === undefined ? null : v)); 
																			isOwner = true;							
																			if(config["verbose"]) {
																				console.log(">> DISPLAY OK >>>>>>>");
																				console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																				console.log("Time: "+new Date().toString());
																				console.log("Socket: "+socket.id);
																				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																				console.log("Synoptic: "+data);
																				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																			}											
																		} 
																	}
																	catch(e) {
																		console.log(">> DISPLAY ERROR >>>>>>>");
																		console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																		console.log("Time: "+new Date().toString());
																		console.log("Socket: "+socket.id);
																		if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																		console.log("Payload: "+data);
																		console.log("Error:");
																		console.log(e);
																		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																		io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																		socket.disconnect();
																		return;
																	}	
																});
																if(isOwner) return;
																// if the requester is not the synoptic's owner, we check to see if she is delegated. For that, we need her username.
																var xmlHttp9x = new XMLHttpRequest();
																xmlHttp9x.open( "GET", config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo", true );
																if(config["verbose"]) {
																	console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																	console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API CALL"));
																	console.log("Time: "+new Date().toString());
																	console.log("Socket: "+socket.id);
																	if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																	console.log("URL: "+config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo");
																	console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																}
																xmlHttp9x.setRequestHeader("Authorization","Bearer "+tkns[socket.id]["token"]);
																xmlHttp9x.onreadystatechange = function() { 
																	try { 
																		if(xmlHttp9x.readyState < 4) return; 
																		if(config["verbose"]) {
																			console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																			console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API RESPONSE "+xmlHttp9x.status));
																			console.log("Time: "+new Date().toString());
																			console.log("Socket: "+socket.id);
																			if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																			console.log("Status: "+xmlHttp9x.status)
																			console.log(xmlHttp9x.responseText);
																			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																		}
																		if(xmlHttp9x.status == 200) {	
																			var preferred_username = JSON.parse(xmlHttp9x.responseText).preferred_username; 							
																			// and now that we have her username, we can make a call to the Personal Data API to check for delegations
																			var xmlHttpAuth12 = new XMLHttpRequest();
																			xmlHttpAuth12.open( "GET", config["personalDataDelegatedApi"].format(preferred_username,tkns[socket.id]["token"],sourceRequest,sourceId,config["synOwnElmtType"]), true);
																			if(config["verbose"]) {
																				console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																				console.log("Summary: "+logSummary(new Date(),socket.id,"DELEGATIONS API CALL "+preferred_username+" "+config["synOwnElmtType"]));
																				console.log("Time: "+new Date().toString());
																				console.log("Socket: "+socket.id);
																				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																				console.log("URL: "+config["personalDataDelegatedApi"].format(preferred_username,tkns[socket.id]["token"],sourceRequest,sourceId,config["synOwnElmtType"]));
																				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																			}
																			xmlHttpAuth12.onreadystatechange = function() {
																				try {
																					if(xmlHttpAuth12.readyState < 4) return;
																					if(config["verbose"]) {
																						console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																						console.log("Summary: "+logSummary(new Date(),socket.id,"DELEGATIONS API RESPONSE "+xmlHttpAuth12.status));
																						console.log("Time: "+new Date().toString());
																						console.log("Socket: "+socket.id);
																						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																						console.log("Status: "+xmlHttpAuth12.status)
																						console.log(xmlHttpAuth12.responseText);
																						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																					}
																					if(xmlHttpAuth12.status == 200) {
																						var responseJson12 = JSON.parse(xmlHttpAuth12.responseText);
																						var isDelegated = false;
																						responseJson12.forEach(function(ownElmt12){
																							try {
																								if(ownElmt12.elementId == data && ownElmt12.elementType == config["synOwnElmtType"]) {
																									// if we are here, she is delegated, we then provide back synoptic metas
																									syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:false, loading:false  };		
																									io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																									isDelegated = true;
																									if(config["verbose"]) {
																										console.log(">> DISPLAY OK >>>>>>>");
																										console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																										console.log("Time: "+new Date().toString());
																										console.log("Socket: "+socket.id);
																										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																										console.log("Synoptic: "+data);
																										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									}											
																								}
																							}
																							catch(e) {
																								console.log(">> DISPLAY ERROR >>>>>>>");
																								console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("Payload: "+data);
																								console.log("Error:");
																								console.log(e);
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																								io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																								socket.disconnect();
																							}											
																						});		
																						if(isDelegated) return;
																						// If the requester is nor the owner nor delegated, we check to see if the synoptic is public. 
																						// We have not checked it as the first thing because we need to know if the user is the owner of the synoptic,
																						// also if the synoptic is public, because if she is the owner, she can write non-mapped variables for the specific
																						// synoptic.
																						var isPublic = false;
																						connection.query("select * from DashboardWizard where high_level_type = 'Synoptic' and ownership = 'public' and id = "+parseInt(data), function (error, results, fields) {
																							try {
																								if ((!error) && results.length > 0) { // if the template is public
																									syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:false, loading: false };		
																									io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																									isPublic = true;
																									if(config["verbose"]) {
																										console.log(">> DISPLAY OK >>>>>>>");
																										console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																										console.log("Time: "+new Date().toString());
																										console.log("Socket: "+socket.id);
																										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																										console.log("Synoptic: "+data);
																										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									}		
																								}
																								else {
																									syns[socket.id] = { synoptic: data, template: null, mappings: null, writable: false, loading: false };
																									console.log(">> DISPLAY ERROR >>>>>>>");
																									console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																									console.log("Time: "+new Date().toString());
																									console.log("Socket: "+socket.id);
																									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																									console.log("Synoptic: "+data);
																									console.log("Error: unauthorized");
																									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
																									socket.disconnect();
																									return;
																								}
																							}
																							catch(e) {																	
																								console.log(">> DISPLAY ERROR >>>>>>>");
																								console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("Synoptic: "+data);
																								console.log("Error:");
																								console.log(e);
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																								io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																								socket.disconnect();
																							}
																						});														
																					}
																					else {
																						console.log(">> DISPLAY ERROR >>>>>>>");
																						console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR PERSONAL DATA API RETURNED "+xmlHttpAuth12.status));
																						console.log("Time: "+new Date().toString());
																						console.log("Socket: "+socket.id);
																						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																						console.log("Error: Personal data API returned status code "+xmlHttpAuth12.status);
																						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																						io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"Personal data API returned status code "+xmlHttpAuth12.status}, (k, v) => v === undefined ? null : v)); 
																						socket.disconnect();
																						return;
																					}
																				}
																				catch(e) {
																					console.log(">> DISPLAY ERROR >>>>>>>");
																					console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																					console.log("Time: "+new Date().toString());
																					console.log("Socket: "+socket.id);
																					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																					console.log("Payload: "+data);
																					console.log("Error:");
																					console.log(e);
																					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																					io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, error:e, status:"ERROR"}, (k, v) => v === undefined ? null : v)); 
																					socket.disconnect();
																					return;
																				}					
																			};
																			xmlHttpAuth12.send(null);
																		}
																		else {
																			console.log(">> DISPLAY ERROR >>>>>>>");
																			console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR KEYCLOAK USERINFO RETURNED "+xmlHttp9x.status));
																			console.log("Time: "+new Date().toString());
																			console.log("Socket: "+socket.id);
																			if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																			console.log("Error: Keycloak userinfo API returned status code "+xmlHttp9x.status);
																			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																			io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"Keycloak userinfo API returned status code "+xmlHttp9x.status}, (k, v) => v === undefined ? null : v)); 
																			socket.disconnect();
																			return;
																		}
																	} 
																	catch(e) {
																		console.log(">> DISPLAY ERROR >>>>>>>");
																		console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																		console.log("Time: "+new Date().toString());
																		console.log("Socket: "+socket.id);
																		if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																		console.log("Payload: "+data);
																		console.log("Error:");
																		console.log(e);
																		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																		io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																		socket.disconnect();
																		return;
																	}	
																};
																xmlHttp9x.send(null);
															}
															else {
																console.log(">> DISPLAY ERROR >>>>>>>");
																console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR OWNERSHIP API RETURNED "+xmlHttpAuth11.status));
																console.log("Time: "+new Date().toString());
																console.log("Socket: "+socket.id);
																if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																console.log("Error: Ownership API returned status code "+xmlHttpAuth11.status);
																console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"Ownership API returned status code "+xmlHttpAuth11.status}, (k, v) => v === undefined ? null : v)); 
																socket.disconnect();
																return;
															}
														}
														catch(e) {
															console.log(">> DISPLAY ERROR >>>>>>>");
															console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
															console.log("Time: "+new Date().toString());
															console.log("Socket: "+socket.id);
															if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
															console.log("Payload: "+data);
															console.log("Error:");
															console.log(e);
															console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
															io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
															socket.disconnect();
															return;
														}	
													}; 
													xmlHttpAuth11.send(null);
												}
												else { // if the requester is not authenticated, our only chance is the synoptic to be public; we then check for it							
													connection.query("select * from DashboardWizard where high_level_type = 'Synoptic' and ownership = 'public' and id = "+parseInt(data), function (error, results, fields) {
														try {
															if ((!error) && results.length > 0) {
																// if the synoptic is public, we provide synoptic metas back to the requester, unless it allows write operations, for which auth is needed 
																if(Object.keys(mappings["output"]).length == 0) { 
																	syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:false, loading:false };		
																	io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																	if(config["verbose"]) {
																		console.log(">> DISPLAY OK >>>>>>>");
																		console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																		console.log("Time: "+new Date().toString());
																		console.log("Socket: "+socket.id);
																		if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																		console.log("Synoptic: "+data);
																		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																	}		
																}
																else if(Object.keys(mappings["output"]).length == 1) {											
																	var varName = mappings["output"][Object.keys(mappings["output"])[0]];
																	if(varName.startsWith("s4csvg_")) {
																		syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:true, loading:false };		
																		io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																		if(config["verbose"]) {
																			console.log(">> DISPLAY OK >>>>>>>");
																			console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																			console.log("Time: "+new Date().toString());
																			console.log("Socket: "+socket.id);
																			if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																			console.log("Synoptic: "+data);
																			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																		}		
																	}
																	else if(varName.startsWith("shared_")) {
																		syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:true, loading:false };		
																		io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																		if(config["verbose"]) {
																			console.log(">> DISPLAY OK >>>>>>>");
																			console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																			console.log("Time: "+new Date().toString());
																			console.log("Socket: "+socket.id);
																			if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																			console.log("Synoptic: "+data);
																			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																		}		
																	}
																	else {
																		var chkUrl = config["getOnePublicKpiValue"].format(varName,sourceRequest,sourceId); 
																		var xmlHttpChkx = new XMLHttpRequest();
																		xmlHttpChkx.open( "GET", chkUrl, true);
																		xmlHttpChkx.onreadystatechange = function() {	
																			try {
																				if(xmlHttpChkx.readyState < 4) return;	
																				if(xmlHttpChkx.status == 200) {
																					// authenticate with default user, and deliver synoptic
																					var xmlHttpwpubltknb = new XMLHttpRequest();
																					xmlHttpwpubltknb.open("POST", config["keycloakAuth"]+"realms/master/protocol/openid-connect/token", true);
																					xmlHttpwpubltknb.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
																					xmlHttpwpubltknb.onreadystatechange = function() {								
																						if(xmlHttpwpubltknb.readyState < 4) return;
																						if(xmlHttpwpubltknb.status != 200) {
																							console.log("ERROR! Unable to authenticate as public writer. Check public writer credentials in configuration file.");
																							return;
																						}
																						var fkAuthData = JSON.parse(xmlHttpwpubltknb.responseText).access_token;								
																						// Once got the token, authenticate with it								
																						try {
																							if(config["verbose"]) {
																								console.log(">> CLIENT EVENT: authenticate >>>>>>>>>>>>>>>>>>"); 
																								console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATING AS DEFAULT USER"));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("Event: authenticate");
																								console.log("Attached Content:");
																								console.log(fkAuthData);
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							}
																							// We validate the provided access token by checking if we are able to retrieve user information from the Keycloak using the provided token
																							var xmlHttp9xab = new XMLHttpRequest();
																							xmlHttp9xab.open( "GET", config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo", true );
																							if(config["verbose"]) {
																								console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																								console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API CALL"));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("URL: "+config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo");
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							}
																							xmlHttp9xab.setRequestHeader("Authorization","Bearer "+fkAuthData);
																							xmlHttp9xab.onreadystatechange = function() { 
																								try { 
																									if(xmlHttp9xab.readyState < 4) return;
																									if(config["verbose"]) {
																										console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																										console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API RESPONSE "+xmlHttp9xab.status));
																										console.log("Time: "+new Date().toString());
																										console.log("Socket: "+socket.id);
																										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																										console.log("Status: "+xmlHttp9xab.status)
																										console.log(xmlHttp9xab.responseText);
																										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									}						
																									if(xmlHttp9xab.status == 200) {			
																										// if everything is OK, we associate the socket to the requester access token and username
																										tkns[socket.id] = {};
																										tkns[socket.id]["token"] = fkAuthData;
																										var changedUser = false;
																										if(tkns[socket.id]["username"] != JSON.parse(xmlHttp9xab.responseText).preferred_username) changedUser = true;
																										tkns[socket.id]["username"] = JSON.parse(xmlHttp9xab.responseText).preferred_username;
																										tkns[socket.id]["roles"] = JSON.parse(xmlHttp9xab.responseText).roles;
																										// Now that the user has authenticated, any trace of preceeding failures due to the fact that she was not authenticated is deleted below here.
																										// Otherwise, shortcuts would frustrate user authentication.
																										if(syns[socket.id] && ( changedUser || !syns[socket.id]["template"])) delete syns[socket.id];
																										if(clni[socket.id]) clni[socket.id].forEach(function(id){
																											try {
																												if(isNaN(id) && (changedUser || (sens[id] && sens[id]["subscriptions"] && sens[id]["subscriptions"][socket.id] && !sens[id]["subscriptions"][socket.id]["isAuthorized"]))) { // sensor
																													delete sens[id]["subscriptions"][socket.id];
																												}
																												else if(changedUser || (kpis[id] && kpis[id]["subscriptions"] && kpis[id]["subscriptions"][socket.id] && !kpis[id]["subscriptions"][socket.id]["isAuthorized"])) { // KPI
																													delete kpis[id]["subscriptions"][socket.id];
																												}
																											}
																											catch(e) {
																												console.log(">> ERROR WHILE CLEANING AFTER AUTHENTICATION >>>>>>>>>>");
																												console.log("Summary: "+logSummary(new Date(),socket.id,"ERROR CLEANING UP AFTER AUTHENTICATION AS DEFAULT USER"));
																												console.log("Time: "+new Date().toString());
																												console.log("Socket: "+socket.id);
																												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																												console.log("Error:");
																												console.log(e);
																												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																											}
																										});									
																										io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"OK"}, (k, v) => v === undefined ? null : v)); 
																										if(config["verbose"]) {
																											console.log(">> AUTHENTICATE OK >>>>>>>>>>>");
																											console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION AS DEFAULT USER OK"));
																											console.log("Time: "+new Date().toString());
																											console.log("Socket: "+socket.id);
																											if(tkns[socket.id]) console.log("Token: "+tkns[socket.id]["token"]);
																											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																										}
																										// Now that the user is some way authenticated, we also deliver confirmation and metadata about the synoptic
																										syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:true, loading:false };		
																										io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																										if(config["verbose"]) {
																											console.log(">> DISPLAY OK >>>>>>>");
																											console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																											console.log("Time: "+new Date().toString());
																											console.log("Socket: "+socket.id);
																											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																											console.log("Synoptic: "+data);
																											console.log("Response:");
																										}															
																										return;
																									}
																									else {
																										console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
																										console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER DUE TO KEYCLOAK USERINFO ERROR STATUS"));
																										console.log("Time: "+new Date().toString());
																										console.log("Socket: "+socket.id);
																										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																										console.log("Payload: "+fkAuthData);
																										console.log("Error: cannot get user info (invalid token?)");
																										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																										io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"ERROR",error:"cannot get user info (invalid token?)"}, (k, v) => v === undefined ? null : v)); 
																										return;
																									}
																								}
																								catch(e) {
																									console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
																									console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER"));
																									console.log("Time: "+new Date().toString());
																									console.log("Socket: "+socket.id);
																									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																									console.log("Payload: "+fkAuthData);
																									console.log("Error:");
																									console.log(e);
																									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																								}
																								return;
																							};
																							xmlHttp9xab.send(null);
																						}
																						catch(e) {
																							console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
																							console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER"));
																							console.log("Time: "+new Date().toString());
																							console.log("Socket: "+socket.id);
																							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																							console.log("Payload: "+fkAuthData);
																							console.log("Error:");
																							console.log(e);
																							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																							return;
																						}

																					};
																					xmlHttpwpubltknb.send("grant_type=password&username="+config["publicWriting"]["usr"]+"&password="+config["publicWriting"]["pwd"]+"&client_id="+config["publicWriting"]["cid"]);
																				}
																				else {
																					syns[socket.id] = { synoptic: data, template: null, mappings: null, writable: false, loading:false };
																					console.log(">> DISPLAY ERROR >>>>>>>");
																					console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																					console.log("Time: "+new Date().toString());
																					console.log("Socket: "+socket.id);
																					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																					console.log("Synoptic: "+data);
																					console.log("Error: unauthorized, the template contains write operations on non-public KPI variables, that cannot be performed without prior authentication");
																					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																					io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
																					socket.disconnect();
																					return;
																				}																
																			}
																			catch(e) {
																				console.log(">> DISPLAY ERROR >>>>>>>");
																				console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																				console.log("Time: "+new Date().toString());
																				console.log("Socket: "+socket.id);
																				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																				console.log("Synoptic: "+data);
																				console.log("Error:");
																				console.log(e);
																				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																				io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																				socket.disconnect();
																				return;
																			}
																		};
																		xmlHttpChkx.send();
																	}
																}
																else {
																	var wrtKpis = false; var wrtNonMapped = false; var writeShared = false;
																	Object.keys(mappings["output"]).forEach(function(key){
																		var varNm = mappings["output"][key];
																		if(varNm.startsWith("s4csvg_")) wrtNonMapped = true;
																		else if(varNm.startsWith("shared_")) wrtShared = true;
																		else wrtKpis = true;
																	});
																	if(!wrtKpis) {
																		syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:true, loading:false };		
																		io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																		if(config["verbose"]) {
																			console.log(">> DISPLAY OK >>>>>>>");
																			console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																			console.log("Time: "+new Date().toString());
																			console.log("Socket: "+socket.id);
																			if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																			console.log("Synoptic: "+data);
																			console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																		}		
																	}
																	else {											
																		var xmlHttpw = new XMLHttpRequest();
																		xmlHttpw.open( "GET", config["getPublicValue"].format(sourceRequest,sourceId), true);
																		xmlHttpw.onreadystatechange = function() {
																			try {
																				if(xmlHttpw.readyState < 4) return;
																				if(xmlHttpw.status == 200) {
																					var responseJson = JSON.parse(xmlHttpw.responseText);
																					var publicKpis = [];
																					for(var t = 0; t < responseJson.length; t++) publicKpis.push(responseJson[t]["valueName"].toString());
																					Object.keys(mappings["output"]).forEach(function(key){
																						var varName = mappings["output"][key];
																						try {
																							if(!publicKpis.includes(varName)) {
																								syns[socket.id] = { synoptic: data, template: null, mappings: null, writable: false, loading:false };
																								console.log(">> DISPLAY ERROR >>>>>>>");
																								console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("Synoptic: "+data);
																								console.log("Error: unauthorized, the template contains write operations on non-public KPI variables, that cannot be performed without prior authentication");
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																								io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
																								socket.disconnect();
																								return;
																							}
																						}
																						catch(e) {
																							console.log(">> DISPLAY ERROR >>>>>>>");
																							console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																							console.log("Time: "+new Date().toString());
																							console.log("Socket: "+socket.id);
																							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																							console.log("Synoptic: "+data);
																							console.log("Error:");
																							console.log(e);
																							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																							socket.disconnect();
																							return;
																						}
																					});
																					// if you have arrived here, it means that everything is OK, so authenticate as default user and deliver synoptic
																					var xmlHttpwpubltknb = new XMLHttpRequest();
																					xmlHttpwpubltknb.open("POST", config["keycloakAuth"]+"realms/master/protocol/openid-connect/token", true);
																					xmlHttpwpubltknb.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
																					xmlHttpwpubltknb.onreadystatechange = function() {								
																						if(xmlHttpwpubltknb.readyState < 4) return;
																						if(xmlHttpwpubltknb.status != 200) {
																							console.log("ERROR! Unable to authenticate as public writer. Check public writer credentials in configuration file.");
																							return;
																						}
																						var fkAuthData = JSON.parse(xmlHttpwpubltknb.responseText).access_token;								
																						// Once got the token, authenticate with it								
																						try {
																							if(config["verbose"]) {
																								console.log(">> CLIENT EVENT: authenticate >>>>>>>>>>>>>>>>>>"); 
																								console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATING AS DEFAULT USER"));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("Event: authenticate");
																								console.log("Attached Content:");
																								console.log(fkAuthData);
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							}
																							// We validate the provided access token by checking if we are able to retrieve user information from the Keycloak using the provided token
																							var xmlHttp9xac = new XMLHttpRequest();
																							xmlHttp9xac.open( "GET", config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo", true );
																							if(config["verbose"]) {
																								console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																								console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API CALL"));
																								console.log("Time: "+new Date().toString());
																								console.log("Socket: "+socket.id);
																								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																								console.log("URL: "+config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo");
																								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							}
																							xmlHttp9xac.setRequestHeader("Authorization","Bearer "+fkAuthData);
																							xmlHttp9xac.onreadystatechange = function() { 
																								try { 
																									if(xmlHttp9xac.readyState < 4) return;
																									if(config["verbose"]) {
																										console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
																										console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API RESPONSE "+xmlHttp9xac.status));
																										console.log("Time: "+new Date().toString());
																										console.log("Socket: "+socket.id);
																										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																										console.log("Status: "+xmlHttp9xac.status)
																										console.log(xmlHttp9xac.responseText);
																										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									}						
																									if(xmlHttp9xac.status == 200) {			
																										// if everything is OK, we associate the socket to the requester access token and username
																										tkns[socket.id] = {};
																										tkns[socket.id]["token"] = fkAuthData;
																										var changedUser = false;
																										if(tkns[socket.id]["username"] != JSON.parse(xmlHttp9xac.responseText).preferred_username) changedUser = true;
																										tkns[socket.id]["username"] = JSON.parse(xmlHttp9xac.responseText).preferred_username;
																										tkns[socket.id]["roles"] = JSON.parse(xmlHttp9xac.responseText).roles;
																										// Now that the user has authenticated, any trace of preceeding failures due to the fact that she was not authenticated is deleted below here.
																										// Otherwise, shortcuts would frustrate user authentication.
																										if(syns[socket.id] && ( changedUser || !syns[socket.id]["template"])) delete syns[socket.id];
																										if(clni[socket.id]) clni[socket.id].forEach(function(id){
																											try {
																												if(isNaN(id) && (changedUser || (sens[id] && sens[id]["subscriptions"] && sens[id]["subscriptions"][socket.id] && !sens[id]["subscriptions"][socket.id]["isAuthorized"]))) { // sensor
																													delete sens[id]["subscriptions"][socket.id];
																												}
																												else if(changedUser || (kpis[id] && kpis[id]["subscriptions"] && kpis[id]["subscriptions"][socket.id] && !kpis[id]["subscriptions"][socket.id]["isAuthorized"])) { // KPI
																													delete kpis[id]["subscriptions"][socket.id];
																												}
																											}
																											catch(e) {
																												console.log(">> ERROR WHILE CLEANING AFTER AUTHENTICATION >>>>>>>>>>");
																												console.log("Summary: "+logSummary(new Date(),socket.id,"ERROR WHILE CLEANING AFTER AUTHENTICATION AS DEFAULT USER"));
																												console.log("Time: "+new Date().toString());
																												console.log("Socket: "+socket.id);
																												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																												console.log("Error:");
																												console.log(e);
																												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																											}
																										});									
																										io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"OK"}, (k, v) => v === undefined ? null : v)); 
																										if(config["verbose"]) {
																											console.log(">> AUTHENTICATE OK >>>>>>>>>>>");
																											console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATE OK AS DEFAULT USER"));
																											console.log("Time: "+new Date().toString());
																											console.log("Socket: "+socket.id);
																											if(tkns[socket.id]) console.log("Token: "+tkns[socket.id]["token"]);
																											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																										}
																										// Now that the user is some way authenticated, we also deliver confirmation and metadata about the synoptic
																										syns[socket.id] = { synoptic: data, template:template, mappings:mappings, writable:true, loading:false };		
																										io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"OK",template:template,mappings:mappings,writable:false}, (k, v) => v === undefined ? null : v)); 
																										if(config["verbose"]) {
																											console.log(">> DISPLAY OK >>>>>>>");
																											console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY OK FOR SYNOPTIC "+data));
																											console.log("Time: "+new Date().toString());
																											console.log("Socket: "+socket.id);
																											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																											console.log("Synoptic: "+data);
																											console.log("Response:");
																											console.log({status:"OK",template:template,mappings:mappings,writable:false});
																											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																										}															
																										return;
																									}
																									else {
																										console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
																										console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER DUE TO KEYCLOAK USERINFO ERROR STATUS"));
																										console.log("Time: "+new Date().toString());
																										console.log("Socket: "+socket.id);
																										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																										console.log("Payload: "+fkAuthData);
																										console.log("Error: cannot get user info (invalid token?)");
																										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																										io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"ERROR",error:"cannot get user info (invalid token?)"}, (k, v) => v === undefined ? null : v)); 
																										return;
																									}
																								}
																								catch(e) {
																									console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
																									console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER"));
																									console.log("Time: "+new Date().toString());
																									console.log("Socket: "+socket.id);
																									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																									console.log("Payload: "+fkAuthData);
																									console.log("Error:");
																									console.log(e);
																									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																									io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																								}
																								return;
																							};
																							xmlHttp9xac.send(null);
																						}
																						catch(e) {
																							console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
																							console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER"));
																							console.log("Time: "+new Date().toString());
																							console.log("Socket: "+socket.id);
																							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																							console.log("Payload: "+fkAuthData);
																							console.log("Error:");
																							console.log(e);
																							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																							io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: fkAuthData, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																							return;
																						}

																					};
																					xmlHttpwpubltknb.send("grant_type=password&username="+config["publicWriting"]["usr"]+"&password="+config["publicWriting"]["pwd"]+"&client_id="+config["publicWriting"]["cid"]);
																				}
																				else {
																					console.log(">> DISPLAY ERROR >>>>>>>");
																					console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data+" KPI DATA PUBLIC VALUE API RETURNED "+xmlHttpw.status));
																					console.log("Time: "+new Date().toString());
																					console.log("Socket: "+socket.id);
																					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																					console.log("Synoptic: "+data);
																					console.log("Error: this API call: ");
																					console.log(config["getPublicValue"].format(sourceRequest,sourceId));
																					console.log("returned HTTP status code "+xmlHttpw.status);
																					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																					io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"internal error"}, (k, v) => v === undefined ? null : v)); 
																					socket.disconnect();
																					return;
																				}
																			}
																			catch(e) {
																				console.log(">> DISPLAY ERROR >>>>>>>");
																				console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																				console.log("Time: "+new Date().toString());
																				console.log("Socket: "+socket.id);
																				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																				console.log("Synoptic: "+data);
																				console.log("Error:");
																				console.log(e);
																				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																				io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
																				socket.disconnect();
																				return;
																			}
																		};
																		xmlHttpw.send();												
																	}
																}
															}
															else {
																syns[socket.id] = { synoptic: data, template: null, mappings: null, writable: false, loading:false };
																console.log(">> DISPLAY ERROR >>>>>>>");
																console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
																console.log("Time: "+new Date().toString());
																console.log("Socket: "+socket.id);
																if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
																console.log("Synoptic: "+data);
																console.log("Error: unauthorized");
																console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
																io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
																socket.disconnect();
																return;
															}
														}
														catch(e) {																	
															console.log(">> DISPLAY ERROR >>>>>>>");
															console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
															console.log("Time: "+new Date().toString());
															console.log("Socket: "+socket.id);
															if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
															console.log("Synoptic: "+data);
															console.log("Error:");
															console.log(e);
															console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
															io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
															socket.disconnect();
															return;
														}
													});							
												}
												
											}
											catch(e) {
												console.log(">> DISPLAY ERROR >>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socket.id);
												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
												console.log("Payload: "+data);
												console.log("Error:");
												console.log(e);
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
												io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
												socket.disconnect();
												return;
											}
										}
									);	
									
								} catch(e){
									console.log(">> DISPLAY ERROR >>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Payload: "+data);
									console.log("Error:");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
									socket.disconnect();
									return;
								} 
							}
						);
									
					}
					catch(e) {
						console.log(">> DISPLAY ERROR >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Payload: "+data);
						console.log("Error:");
						console.log(e);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
						socket.disconnect();
						return;
					}
				};
				xmlHttpTpl.send(null);					
			} 
			catch(e) {
				console.log(">> DISPLAY ERROR >>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"DISPLAY ERROR FOR SYNOPTIC "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("display",JSON.stringify({event: "display", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
				socket.disconnect();
				return;
			}				
		});
		
		socket.on("authenticate", function(data) { // this event is used by a client for submitting its access token
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: authenticate >>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST AUTHENTICATE"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: authenticate");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				// We validate the provided access token by checking if we are able to retrieve user information from the Keycloak using the provided token
				var xmlHttp9xa = new XMLHttpRequest();
				xmlHttp9xa.open( "GET", config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo", true );
				if(config["verbose"]) {
					console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API CALL"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("URL: "+config["keycloakAuth"]+"realms/master/protocol/openid-connect/userinfo");
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				xmlHttp9xa.setRequestHeader("Authorization","Bearer "+data);
				xmlHttp9xa.onreadystatechange = function() { 
					try { 
						if(xmlHttp9xa.readyState < 4) return;
						if(config["verbose"]) {
							console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"KEYCLOAK USERINFO API RESPONSE "+xmlHttp9xa.status));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Status: "+xmlHttp9xa.status)
							console.log(xmlHttp9xa.responseText);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}						
						if(xmlHttp9xa.status == 200) {			
							// if everything is OK, we associate the socket to the requester access token and username
							tkns[socket.id] = {};
							tkns[socket.id]["token"] = data;
							var changedUser = false;
							if(tkns[socket.id]["username"] != JSON.parse(xmlHttp9xa.responseText).preferred_username) changedUser = true;
							tkns[socket.id]["username"] = JSON.parse(xmlHttp9xa.responseText).preferred_username;
							tkns[socket.id]["roles"] = JSON.parse(xmlHttp9xa.responseText).roles;
							// Now that the user has authenticated, any trace of preceeding failures due to the fact that she was not authenticated is deleted below here.
							// Otherwise, shortcuts would frustrate user authentication.
							if(syns[socket.id] && ( changedUser || !syns[socket.id]["template"])) delete syns[socket.id];
							if(clni[socket.id]) clni[socket.id].forEach(function(id){
								try {
									if(isNaN(id) && (changedUser || (sens[id] && sens[id]["subscriptions"] && sens[id]["subscriptions"][socket.id] && !sens[id]["subscriptions"][socket.id]["isAuthorized"]))) { // sensor
										delete sens[id]["subscriptions"][socket.id];
									}
									else if(changedUser || (kpis[id] && kpis[id]["subscriptions"] && kpis[id]["subscriptions"][socket.id] && !kpis[id]["subscriptions"][socket.id]["isAuthorized"])) { // KPI
										delete kpis[id]["subscriptions"][socket.id];
									}
								}
								catch(e) {
									console.log(">> ERROR WHILE CLEANING AFTER AUTHENTICATION >>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"ERROR WHILE CLEANING AFTER AUTHENTICATION"));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Error:");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}
							});									
							io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 
							if(config["verbose"]) {
								console.log(">> AUTHENTICATE OK >>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATED"+(tkns[socket.id]?" AS "+tkns[socket.id]["username"]:"")));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("Token: "+tkns[socket.id]["token"]);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
							return;
						}
						else {
							console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR AS DEFAULT USER DUE TO KEYCLOAK USERINFO ERROR STATUS"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Error: cannot get user info (invalid token?)");
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: data, status:"ERROR",error:"cannot get user info (invalid token?)"}, (k, v) => v === undefined ? null : v)); 
							return;
						}
					}
					catch(e) {
						console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Payload: "+data);
						console.log("Error:");
						console.log(e);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
					}
					return;
				};
				xmlHttp9xa.send(null);
			}
			catch(e) {
				console.log(">> AUTHENTICATE ERROR >>>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"AUTHENTICATION ERROR"));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("authenticate",JSON.stringify({event: "authenticate", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
				return;
			}
		});
		
		socket.on("read", function(data) { // this event is used by clients for a one-shot read of a variable value
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: read >>>>>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST READ "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: read");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				// We keep track that a request was submitted from this socket for this variable. It will be usefull for cleaning up everything at socket disconnect.
				if(!clni[socket.id]) clni[socket.id] = [data]; else if(!clni[socket.id].includes(data)) clni[socket.id].push(data); 				
				if(data.startsWith("shared_")) { // Then, if the requested variable is a shared variable
					if(shared[data]) {
						var lastValue = shared[data]["value"];
						try { lastValue = JSON.parse(lastValue); } catch(me) {}
						io.in(socket.id).emit("read", JSON.stringify({
							event: "read",
							status: "OK",
							id: shared[data]["id"], 
							lastValue: lastValue,
							timestamp: shared[data]["timestamp"] 
						}, (k, v) => v === undefined ? null : v)); 
						if(config["verbose"]) {
							console.log(">> READ OK >>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"READ OK "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Response:");
							console.log({
								event: "read",
								status: "OK",
								id: shared[data]["id"], 
								lastValue: shared[data]["value"],
								timestamp: shared[data]["timestamp"] 
							});
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					else {
						console.log(">> READ ERROR >>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Payload: "+data);
						console.log("Error: shared variable not found, maybe a typo in variable name?");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"Shared variable \""+data+"\" not found. Maybe a typo in variable name?"}, (k, v) => v === undefined ? null : v)); 
						return;
					}
				}
				else if(data.startsWith("s4csvg_")) {	// else if the requested variable is a non-mapped variable
					if(syns[socket.id]["loading"]) {
						console.log(">> READ ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Synoptic is loading, please wait.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "read", request: data, status:"ERROR",error:"Synoptic is loading, please wait."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(syns[socket.id] && vars[data] && vars[data][syns[socket.id]["synoptic"]]) { // if the socket is binded to a synoptic (that is necessary because non-mapped variables scope is the synoptic) and if the variable has a value for the specific synoptic
						var lastValue = vars[data][syns[socket.id]["synoptic"]]["value"];
						try { lastValue = JSON.parse(lastValue); } catch(me) {}
						io.in(socket.id).emit("read", JSON.stringify({
							event: "read",
							status: "OK",
							id: vars[data][syns[socket.id]["synoptic"]]["id"], 
							lastValue: lastValue, 
							timestamp: vars[data][syns[socket.id]["synoptic"]]["timestamp"] 
						}, (k, v) => v === undefined ? null : v)); 
						if(config["kafka"]["enable"]["nonMapped"]) listenBroker(vars[data][syns[socket.id]["synoptic"]]["id"]);
						if(config["verbose"]) {
							console.log(">> READ OK >>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"READ OK "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Response:");
							console.log({
								event: "read",
								status: "OK",
								id: vars[data][syns[socket.id]["synoptic"]]["id"], 
								lastValue: vars[data][syns[socket.id]["synoptic"]]["value"], 
								timestamp: vars[data][syns[socket.id]["synoptic"]]["timestamp"] 
							});
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					else {
						console.log(">> READ ERROR >>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Payload: "+data);
						if(!syns[socket.id]) console.log("Error: socket is not binded to any synoptic");
						else if(!(syns[socket.id] && syns[socket.id]["mappings"] && syns[socket.id]["mappings"]["input"] && syns[socket.id]["mappings"]["input"][data])) console.log("Error: variable not found, maybe a typo in variable name");
						else console.log("Error: no value found for this variable in current synoptic");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						if(!syns[socket.id]) io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"Bind to a synoptic first, throught he \"display\" event."}, (k, v) => v === undefined ? null : v)); 
						else if(!(syns[socket.id] && syns[socket.id]["mappings"] && syns[socket.id]["mappings"]["input"] && syns[socket.id]["mappings"]["input"][data])) io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"Non-mapped variable \""+data+"\" not found in current synoptic. Maybe a typo in variable name?"}, (k, v) => v === undefined ? null : v)); 
						else io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"No value found for this variable in current synoptic"}, (k, v) => v === undefined ? null : v)); 
					}
				}
				else if(isNaN(data)) { // sensor
					if(sens[data] && sens[data]["subscriptions"][socket.id]) { // if the requester has already tried accessing the sensor in current socket session
						if(sens[data]["subscriptions"][socket.id]["isAuthorized"]) { // if the requester has already gained access to the sensor in current socket session
							if(sens[data]["value"] !== null && sens[data]["value"] !== undefined) { // if a value is actually made available from the specified sensor
								var lastValue = sens[data]["value"];
								try { lastValue = JSON.parse(lastValue); } catch(me) {}
								io.in(socket.id).emit("read", JSON.stringify({ 
									event: "read",
									status: "OK",
									id: data, 
									lastValue: lastValue, 
									timestamp: sens[data]["timestamp"] 
								}, (k, v) => v === undefined ? null : v)); 
								if(config["kafka"]["enable"]["sensors"]) listenBroker(data);
								if(config["verbose"]) {
									console.log(">> READ OK >>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"READ OK "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Payload: "+data);
									console.log("Response:");
									console.log({ 
										event: "update "+data,
										id: data, 
										lastValue: sens[data]["value"], 
										timestamp: sens[data]["timestamp"] 
									});
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}
								return;
							}
							else {
								console.log(">> READ ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Payload: "+data);
								console.log("Error: no value");
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"No value"}, (k, v) => v === undefined ? null : v)); 
							}								
						}
						else { // if the requster is already known not to be granted access to the sensor
							console.log(">> READ ERROR >>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
							return;
						}
					}	
					else {	 // if it is the first time that the requester attempts reading from the sensor					
						var chkUrl = null;
						// We verify if the requester is authorized to access the sensor (different requests for authenticated vs non-authenticated requesters). 
						if(tkns[socket.id]) chkUrl = config["getOneSensorValue"].format(data.split(" ")[0],data.split(" ")[1],tkns[socket.id]["token"]); 
						else chkUrl =  config["getOnePublicSensorValue"].format(data.split(" ")[0],data.split(" ")[1]); 
						var xmlHttpChkd = new XMLHttpRequest();
						xmlHttpChkd.open( "GET", chkUrl, true);
						if(config["verbose"]) {
							console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"SENSOR API CALL"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("URL: "+chkUrl);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						xmlHttpChkd.onreadystatechange = function() {	
							try {
								if(xmlHttpChkd.readyState < 4) return;
								if(config["verbose"]) {
									console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
									console.log("Summary: "+logSummary(new Date(),socket.id,"SENSOR API RESPONSE "+xmlHttpChkd.status));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Status: "+xmlHttpChkd.status)
									console.log(xmlHttpChkd.responseText);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}		
								var isAuthorized = xmlHttpChkd.status == 200; // in any case, we keep track of the request and of its outcome, to avoid further requests in the future
								var value = null;
								var timestamp = null;
								if(isAuthorized) { // only if authorized, we retrieve the last value and its associated timestamp
									if(JSON.parse(xmlHttpChkd.responseText)["realtime"]["results"]) { // if the sensor actually exists (it could be that the device exists and the requester is granted, but the sensor name is mispelled, for example)
										JSON.parse(xmlHttpChkd.responseText)["realtime"]["results"]["bindings"].forEach(function(binding) { 
											value = binding[data.split(" ")[1]]["value"]; 
											timestamp = new Date(binding["measuredTime"]["value"]).getTime();
										});	
									}
									else { // otherwise, if the specified sensor does not exist on the device, fail
										console.log(">> READ ERROR >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Payload: "+data);
										console.log("Error: No value. Sensor is missing or not working.");
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"No value. Sensor is missing or not working."}, (k, v) => v === undefined ? null : v)); 
										return;
									}
								}
								if(!sens[data]) { // if we have not already an in-memory copy of the sensor, we build it
									var subscriptions = {};
									subscriptions[socket.id] = { isAuthorized: isAuthorized, isActive: false };
									sens[data] = { 
										id: data,
										value: value, 
										timestamp: timestamp, 
										subscriptions: subscriptions
									}; 
								}
								else { // if we already have an in-memory copy of the sensor, we just keep track of the new reading request, and of its outcome (authorized or not)
									if(!Object.keys(sens[data]["subscriptions"]).includes(socket.id)) { 
										sens[data]["subscriptions"][socket.id] = { isAuthorized: isAuthorized, isActive: false }; 
									} 
								}
								if(isAuthorized) { // if authorized, we in end deliver the value back to the requester
									var lastValue = sens[data]["value"];
									try { lastValue = JSON.parse(lastValue); } catch(me) {}
									io.in(socket.id).emit("read", JSON.stringify({ 
										event: "read",
										status: "OK",
										id: data, 
										lastValue: lastValue, 
										timestamp: sens[data]["timestamp"] 
									}, (k, v) => v === undefined ? null : v)); 
									if(config["kafka"]["enable"]["sensors"]) listenBroker(data);
									if(config["verbose"]) {
										console.log(">> READ OK >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"READ OK "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Payload: "+data);
										console.log("Response:");
										console.log({ 
											event: "read",
											status: "OK",
											id: data, 
											lastValue: sens[data]["value"], 
											timestamp: sens[data]["timestamp"] 
										});
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}
								else {
									console.log(">> READ ERROR >>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Payload: "+data);
									console.log("Error: unauthorized");
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
								}
							}
							catch(e) {
								console.log(">> READ ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Payload: "+data);
								console.log("Error:");
								console.log(e);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
							}
						};
						xmlHttpChkd.send(null);
					}						
				}
				else { // if the read request is related to a MyKPI
					if(kpis[data] && kpis[data]["subscriptions"] && kpis[data]["subscriptions"][socket.id]) { // if the requester has already tried accessing the KPI in current socket session
						if(kpis[data]["subscriptions"][socket.id]["isAuthorized"]) { // if in previous attempts the requester has been found to have granted access to the KPI
							if(kpis[data]["value"] !== null && kpis[data]["value"] !== undefined) { // if a value actually is available for the requested KPI
								var lastValue = kpis[data]["value"];
								try { lastValue = JSON.parse(lastValue); } catch(me) {}
								io.in(socket.id).emit("read", JSON.stringify({ 
									event: "read",
									status: "OK",
									id: data, 
									lastValue: lastValue, 
									timestamp: kpis[data]["timestamp"] 
								}, (k, v) => v === undefined ? null : v)); 
								if(config["kafka"]["enable"]["myKPIs"]) listenBroker("kpi-"+data);
								if(config["verbose"]) {
									console.log(">> READ OK >>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"READ OK "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Payload: "+data);
									console.log("Response:");
									console.log({ 
										event: "read",
										status: "OK",
										id: data, 
										lastValue: kpis[data]["value"], 
										timestamp: kpis[data]["timestamp"] 
									});
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}
							}	
							else {
								console.log(">> READ ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Payload: "+data);
								console.log("Error: no value");
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"No value"}, (k, v) => v === undefined ? null : v)); 
								return;
							}								
						}
						else { // if the requester is instead already known not to have granted access to the KPI
							console.log(">> READ ERROR >>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
						}
					}	
					else {						
						var chkUrl = null;
						// If the requester has never accessed the KPI in current socket session, we have to verify if she is authorized.
						if(tkns[socket.id]) chkUrl = config["getOneKpiValue"].format(data,tkns[socket.id]["token"],sourceRequest,sourceId); 
						else chkUrl =  config["getOnePublicKpiValue"].format(data,sourceRequest,sourceId); 
						var xmlHttpChka = new XMLHttpRequest();
						xmlHttpChka.open( "GET", chkUrl, true);
						if(config["verbose"]) {
							console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"KPI API CALL"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("URL: "+chkUrl);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						xmlHttpChka.onreadystatechange = function() {	
							try {
								if(xmlHttpChka.readyState < 4) return;
								if(config["verbose"]) {
									console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
									console.log("Summary: "+logSummary(new Date(),socket.id,"KPI API RESPONSE "+xmlHttpChka.status));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Status: "+xmlHttpChka.status)
									console.log(xmlHttpChka.responseText);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}		
								var isAuthorized = xmlHttpChka.status == 200; // Whichever the case is, we keep track of the request and its outcome to avoid further requests
								var value = null;
								var timestamp = null;
								if(isAuthorized) { // if authorized, we get the KPI value
									JSON.parse(xmlHttpChka.responseText).forEach(function(xmlHttp4eVal) { 
										value = xmlHttp4eVal["value"]; 
										timestamp = xmlHttp4eVal["dataTime"]; 
									});
								}
								if(!kpis[data]) { // if we have not an in-memory copy of the KPI, we build it
									var subscriptions = {};
									subscriptions[socket.id] = { isAuthorized: isAuthorized, isActive: false };
									kpis[data] = { 
										id: data,
										value: value, 
										timestamp: timestamp, 
										subscriptions: subscriptions 
									}; 
								}
								else { // if we already have an in-memory copy of the KPI, we just keep track of the new request and its outcome (authorized or not)
									if(!Object.keys(kpis[data]["subscriptions"]).includes(socket.id)) { 
										kpis[data]["subscriptions"][socket.id] = { isAuthorized: isAuthorized, isActive: false }; 
									} 
								}
								if(isAuthorized) { // finally, if authorized, we provide back the value to the requester
									var lastValue = kpis[data]["value"];
									try { lastValue = JSON.parse(lastValue); } catch(me) {}
									io.in(socket.id).emit("read", JSON.stringify({ 
										event: "read",
										status: "OK",
										id: data, 
										lastValue: lastValue, 
										timestamp: kpis[data]["timestamp"] 
									}, (k, v) => v === undefined ? null : v)); 
									if(config["kafka"]["enable"]["myKPIs"]) listenBroker("kpi-"+data);
									if(config["verbose"]) {
										console.log(">> READ OK >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"READ OK "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Payload: "+data);
										console.log("Response:");
										console.log({ 
											event: "read",
											status: "OK",
											id: data, 
											lastValue: kpis[data]["value"], 
											timestamp: kpis[data]["timestamp"] 
										});
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}								
								}
								else {
									console.log(">> READ ERROR >>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Payload: "+data);
									console.log("Error: unauthorized");
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
								}
							}
							catch(e) {
								console.log(">> READ ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Payload: "+data);
								console.log("Error:");
								console.log(e);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 							
							}
						};
						xmlHttpChka.send(null);
					}							
				}
			} 
			catch(e) {					
				console.log(">> READ ERROR >>>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"READ ERROR "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("read",JSON.stringify({event: "read", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
			}
		});
		
		socket.on("write", function(data) { // this event is used by clients for writing variables
			try {					
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: write >>>>>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST WRITE"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: write");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				var dataObj = JSON.parse(data);
				if((dataObj["id"]+"").startsWith("shared_")) {		
					// build/refresh the in-memory shared variable (remember shared variables exist nowhere else than in socket server memory though)
					if(!shared[dataObj.id]) shared[dataObj.id] = {};
					shared[dataObj.id] = { id: dataObj["id"], value: dataObj["value"], timestamp: new Date().getTime(), subscriptions: shared[dataObj["id"]]["subscriptions"]?shared[dataObj["id"]]["subscriptions"]:[] };
					// deliver new value to all sockets subscribed for this variable
					shared[dataObj.id]["subscriptions"].forEach(function(socketid){ 
						try {							
							var lastValue = shared[dataObj.id]["value"];
							try { lastValue = JSON.parse(lastValue); } catch(me) {}
							io.in(socketid).emit("update "+shared[dataObj.id]["id"], JSON.stringify({ 
								event: "update "+shared[dataObj.id]["id"],
								id: shared[dataObj.id]["id"], 
								lastValue: lastValue, 
								timestamp: shared[dataObj.id]["timestamp"]
							}, (k, v) => v === undefined ? null : v)); 
							if(config["verbose"]) {
								console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERED FOR "+shared[dataObj.id]["id"]));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socketid);
								if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
								console.log({ 
									event: "update "+shared[dataObj.id]["id"],
									id: shared[dataObj.id]["id"], 
									lastValue: shared[dataObj.id]["value"], 
									timestamp: shared[dataObj.id]["timestamp"]
								});
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
						}
						catch(e) {
							console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERY ERROR FOR "+shared[dataObj.id]["id"]));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socketid);
							if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
							console.log("Error: it was not possible to deliver the below object to the above addressee");
							console.log({ 
								event: "update "+shared[dataObj.id]["id"],
								id: shared[dataObj.id]["id"], 
								lastValue: shared[dataObj.id]["value"], 
								timestamp: shared[dataObj.id]["timestamp"]
							});
							console.log("The occurred exception follows: ");
							console.log(e);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					});
					if(config["kafka"]["enable"]["shared"]) notifyBroker({ 
						event: "shared_"+shared[dataObj.id]["id"],
						id: shared[dataObj.id]["id"], 
						lastValue: shared[dataObj.id]["value"], 
						timestamp: shared[dataObj.id]["timestamp"],
						from: config["srvSrcReq"]
					},socket.id);					
					try { // Store on DB for recovery purposes						
						connection.query(
							'insert into SynopticSrvVars(name,value,type,timestamp) values (?,?,?,?)', 
							[ dataObj["id"], dataObj["value"], typeof dataObj["value"], shared[dataObj["id"]]["timestamp"] ],
							function (error, results) { 
								try { 
									if (error) { 									
										console.log(">> DB ERROR >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"DB INSERT SYNOPTICSRVVARS ERROR FOR "+dataObj["id"]));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Could not store the following variable value in MySQL database:");
										console.log(shared[dataObj["id"]]);
										console.log("due to the following error:");
										console.log(error);
										console.log("<<<<<<<<<<<<<<<<<<<\n\n");
									}
									else if(config["verbose"]) {
										console.log(">> DB BACKUP OK >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"DB INSERT SYNOPTICSRVVARS OK FOR "+dataObj["id"]));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Successfully stored the following variable value:");
										console.log(shared[dataObj["id"]]);
										console.log("in MySQL database for recovery purposes.");
										console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								} catch(e){
									console.log(">> BACKUP ERROR >>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"BACKUP ERROR FOR "+dataObj["id"]));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Could not store the following variable value in MySQL database:");
									console.log(shared[dataObj["id"]]);
									console.log("due to the following exception:");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<\n\n");
								} 
							}
						);		
					}
					catch(dbe) {
						console.log(">> BACKUP ERROR >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"BACKUP ERROR FOR "+dataObj["id"]));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Could not store the following variable value in MySQL database:");
						console.log(shared[dataObj["id"]]);
						console.log("due to the following exception:");
						console.log(dbe);
						console.log("<<<<<<<<<<<<<<<<<<<\n\n");
					}
					io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 
					if(config["verbose"]) {
						console.log(">> WRITE OK >>>>>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE OK FOR "+dataObj.id));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log(shared[dataObj.id]);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}					
				}
				else if((dataObj["id"]+"").startsWith("s4csvg_")) { // if the variable to be written is a non-mapped variable					
					if(syns[socket.id]["loading"]) {
						console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Synoptic is loading, please wait.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:"Synoptic is loading, please wait."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!syns[socket.id]) { // if the socket is not binded to any synoptic, fail. Indeed, the scope of non-mapped variables is the synoptic, so the socket MUST be binded to a synoptic for that the request could make sense.
						console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Socket is not binded to any synoptic");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:"Bind to a synoptic first, throught the \"display\" event."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!(syns[socket.id] && syns[socket.id]["writable"])) { // if the requester is not the owner of the synoptic, fail. Indeed, only the synoptic's owner can write non-mapped variables for a synoptic
						console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: The requester is not the synoptic owner.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!(syns[socket.id] && syns[socket.id]["mappings"] && syns[socket.id]["mappings"]["output"] && syns[socket.id]["mappings"]["output"][dataObj["id"]]) && !(syns[socket.id] && syns[socket.id]["mappings"] && syns[socket.id]["mappings"]["input"] && syns[socket.id]["mappings"]["input"][dataObj["id"]])) { // if the variable does not exist in current synoptic
						console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Non-mapped variable not found in current synoptic, maybe a typo in variable name?");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:"Non-mapped variable not found in current synoptic. Maybe a typo in variable name?"}, (k, v) => v === undefined ? null : v)); 
						return;
					}					
					// build/refresh the in-memory non-mapped variable (remember non-mapped variables exist nowhere else than in socket server memory though)
					if(!vars[dataObj.id]) vars[dataObj.id] = {};
					vars[dataObj.id][syns[socket.id]["synoptic"]] = { id: dataObj["id"], value: dataObj["value"], synoptic: syns[socket.id]["synoptic"], timestamp: new Date().getTime(), subscriptions: vars[dataObj["id"]][syns[socket.id]["synoptic"]]?vars[dataObj["id"]][syns[socket.id]["synoptic"]]["subscriptions"]:[]};
					// deliver new value to all sockets subscribed for this variable
					vars[dataObj.id][syns[socket.id]["synoptic"]]["subscriptions"].forEach(function(socketid){ 
						try {							
							var lastValue = vars[dataObj.id][syns[socket.id]["synoptic"]]["value"];
							try { lastValue = JSON.parse(lastValue); } catch(me) {}
							io.in(socketid).emit("update "+vars[dataObj.id][syns[socket.id]["synoptic"]]["id"], JSON.stringify({ 
								event: "update "+vars[dataObj.id][syns[socket.id]["synoptic"]]["id"],
								id: vars[dataObj.id][syns[socket.id]["synoptic"]]["id"], 
								lastValue: lastValue, 
								synoptic: syns[socket.id]["synoptic"], 
								timestamp: vars[dataObj.id][syns[socket.id]["synoptic"]]["timestamp"]
							}, (k, v) => v === undefined ? null : v)); 
							if(config["verbose"]) {
								console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERED FOR "+dataObj.id+" OF "+syns[socket.id]["synoptic"]));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socketid);
								if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
								console.log({ 
									event: "update "+vars[dataObj.id][syns[socket.id]["synoptic"]]["id"],
									id: vars[dataObj.id][syns[socket.id]["synoptic"]]["id"], 
									lastValue: vars[dataObj.id][syns[socket.id]["synoptic"]]["value"], 
									synoptic: syns[socket.id]["synoptic"], 
									timestamp: vars[dataObj.id][syns[socket.id]["synoptic"]]["timestamp"] 
								});
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
						}
						catch(e) {
							console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERY ERROR FOR "+dataObj.id+" OF "+syns[socket.id]["synoptic"]));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socketid);
							if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
							console.log("Error: it was not possible to deliver the below object to the above addressee");
							console.log({ 
								event: "update "+data,
								id: vars[dataObj.id][syns[socket.id]["synoptic"]]["id"], 
								lastValue: vars[dataObj.id][syns[socket.id]["synoptic"]]["value"], 
								synoptic: syns[socket.id]["synoptic"], 
								timestamp: vars[dataObj.id][syns[socket.id]["synoptic"]]["timestamp"] 
							});
							console.log("The occurred exception follows: ");
							console.log(e);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					});
					if(config["kafka"]["enable"]["nonMapped"]) notifyBroker({ 
						event: "nonMapped_"+syns[socket.id]["synoptic"]+"_"+vars[dataObj.id][syns[socket.id]["synoptic"]]["id"],
						id: vars[dataObj.id][syns[socket.id]["synoptic"]]["id"], 
						lastValue: vars[dataObj.id][syns[socket.id]["synoptic"]]["value"], 
						synoptic: syns[socket.id]["synoptic"], 
						timestamp: vars[dataObj.id][syns[socket.id]["synoptic"]]["timestamp"],
						from: config["srvSrcReq"]
					},socket.id);
					
					try { // Store on DB for recovery purposes
						connection.query(
							'insert into SynopticSrvVars(name,value,type,synoptic,timestamp) values (?,?,?,?,?)', 
							[ 
								vars[dataObj.id][syns[socket.id]["synoptic"]]["id"], 
								vars[dataObj.id][syns[socket.id]["synoptic"]]["value"], 
								typeof vars[dataObj.id][syns[socket.id]["synoptic"]]["value"], 
								syns[socket.id]["synoptic"],
								vars[dataObj.id][syns[socket.id]["synoptic"]]["timestamp"]
							], 
							function (error, results) { 
								try { 
									if (error) { 									
										console.log(">> DB ERROR >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"DB INSERT ERROR FOR "+dataObj.id+" OF "+syns[socket.id]["synoptic"]));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Synoptic: "+syns[socket.id]["synoptic"]);
										console.log("Could not store the following variable value in MySQL database:");
										console.log(vars[dataObj.id][syns[socket.id]["synoptic"]]);
										console.log("due to the following error:");
										console.log(error);
										console.log("<<<<<<<<<<<<<<<<<<<\n\n");
									}
									else if(config["verbose"]) {
										console.log(">> DB BACKUP OK >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"DB INSERT OK FOR "+dataObj.id+" OF "+syns[socket.id]["synoptic"]));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Synoptic: "+syns[socket.id]["synoptic"]);
										console.log("Successfully stored the following variable value:");
										console.log(vars[dataObj.id][syns[socket.id]["synoptic"]]);
										console.log("in MySQL database for recovery purposes.");
										console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								} catch(e){
									console.log(">> BACKUP ERROR >>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"BACKUP ERROR FOR "+dataObj.id+" OF "+syns[socket.id]["synoptic"]));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									if(syns[socket.id]) console.log("Synoptic: "+syns[socket.id]["synoptic"]);
									console.log("Could not store the following variable value in MySQL database:");
									console.log(vars[dataObj.id][syns[socket.id]["synoptic"]]);
									console.log("due to the following exception:");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<\n\n");
								} 
							}
						);		
					}
					catch(dbe) {
						console.log(">> BACKUP ERROR >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"BACKUP ERROR FOR "+dataObj.id+" OF "+syns[socket.id]["synoptic"]));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+syns[socket.id]["synoptic"]);
						console.log("Could not store the following variable value in MySQL database:");
						console.log(vars[dataObj.id][syns[socket.id]["synoptic"]]);
						console.log("due to the following exception:");
						console.log(dbe);
						console.log("<<<<<<<<<<<<<<<<<<<\n\n");						
					}
					//	
					io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 
					if(config["verbose"]) {
						console.log(">> WRITE OK >>>>>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE OK FOR "+dataObj.id+" OF "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null")));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log(vars[dataObj.id][syns[socket.id]["synoptic"]]);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
				}
				else if(!isNaN(dataObj["id"])){ // if the writing request is for a KPI
					var obj = dataObj
					var dataTime = new Date();
					if(!tkns[socket.id]) { // if the requester is not authenticated, fail
						console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Tried to write the following without having authenticated:"); 
						console.log(obj);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "write", request: obj, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(false && kpis[obj.id] && kpis[obj.id]["editors"] && kpis[obj.id]["editors"].includes(tkns[socket.id]["username"])) { // if the requester has already written the variable in current socket, immediately edit in-memory copy of the KPI and deliver the new value to all subscribed sockets and to the broker. This behavior is now disabled (June 23, 2020), since we have changed our mind and decided that we want to deliver the new value to clients only after that a positive response has arrived from the KPI Data Value API. That is the reason for which we have a false at the beginning of the condition.
						kpis[obj.id]["value"] = obj.value;
						kpis[obj.id]["timestamp"] = dataTime.getTime();
						if(kpis[obj.id]["subscriptions"]) Object.keys(kpis[obj.id]["subscriptions"]).forEach(function(socketid){ 
							if(kpis[obj.id]["subscriptions"][socketid]["isAuthorized"] && kpis[obj.id]["subscriptions"][socketid]["isActive"]) {
								try {							
									var lastValue = obj.value;
									try { lastValue = JSON.parse(lastValue); } catch(me) {}
									io.in(socketid).emit("update "+obj.id, JSON.stringify({ 
										event: "update "+obj.id,
										id: obj.id, 
										lastValue: lastValue, 
										timestamp: dataTime.getTime()
									}, (k, v) => v === undefined ? null : v)); 
									if(config["verbose"]) {
										console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERED FOR "+obj.id));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socketid);
										if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
										console.log({ 
											event: "update "+obj.id,
											id: obj.id, 
											lastValue: obj.value, 
											timestamp: dataTime.getTime()
										});
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}
								catch(e) {
									console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socketid,"UPDATE DELIVERY ERROR FOR "+obj.id));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socketid);
									if(tkns[socketid]) console.log("User: "+tkns[socketid]["username"]);
									console.log("Error: it was not possible to deliver the below object to the above addressee");
									console.log({ 
										event: "update "+obj.id,
										id: obj.id, 
										lastValue: obj.value, 
										timestamp: dataTime.getTime()
									});
									console.log("The occurred exception follows: ");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}
							}
						});
						/* 	
							This notification is no longer delivered because it is the KPI Data Value API that 
							delivers the notification to the message broker after successful completion of a 
							writing operation on a KPI.
							
							notifyBroker({ 
								event: "update "+obj.id,
								id: obj.id, 
								lastValue: obj.value, 
								timestamp: dataTime.getTime(),
								from: config["srvSrcReq"]
							}, socket.id);		
						*/
						io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 						
						if(config["verbose"]) {
							console.log(">> WRITE OK >>>>>>>>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE OK"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log(obj);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}				
					// Then, call the KPI Data Values API to persist the value 					
					var xmlHttpw999 = new XMLHttpRequest();
					xmlHttpw999.open("POST", config["setValue"].format(obj["id"], tkns[socket.id]["token"], sourceRequest, sourceId), true);
					xmlHttpw999.setRequestHeader("Content-Type", "application/json");
					xmlHttpw999.onreadystatechange = function() {
						try {
							if(xmlHttpw999.readyState < 4) return;
							if(config["verbose"]) {
									console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
									console.log("Summary: "+logSummary(new Date(),socket.id,"SET KPI API RESPONSE "+xmlHttpw999.status));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Status: "+xmlHttpw999.status)
									console.log(xmlHttpw999.responseText);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}		
							if(xmlHttpw999.status == 200) {	
								if(!(kpis[obj.id] && kpis[obj.id]["editors"] && kpis[obj.id]["editors"].includes(tkns[socket.id]["username"]))) { // if the variable does not exist in memory or the user is not among the editors, create/update the in-memory representation of the variable (KPI)
									if(!kpis[obj.id]) {
										kpis[obj.id] = {};
										kpis[obj.id]["id"] = obj.id;
										kpis[obj.id]["subscriptions"] = {};										
										kpis[obj.id]["subscriptions"][socket.id] = { isAuthorized: true, isActive: false };
									}
									if(!kpis[obj.id]["editors"]) kpis[obj.id]["editors"] = [];
									kpis[obj.id]["editors"].push(tkns[socket.id]["username"]); // add current user to granted editors here
								}		
								// Whatever the case is, update value and timestamp in in-memory representation of the variable, and send back a confirmation.
								kpis[obj.id]["value"] = obj.value;
								kpis[obj.id]["timestamp"] = dataTime.getTime();																									
								io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));
								if(config["verbose"]) {
									console.log(">> WRITE OK >>>>>>>>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE OK"));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log(obj);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}
							}		
							else {
								console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR SET KPI API RESPONSE STATUS "+xmlHttpw999.status));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Tried to write the following:");
								console.log(obj);
								console.log("Error: HTTP status "+xmlHttpw999.status);
								console.log("Response body:");
								console.log(xmlHttpw999.responseText);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								if(!(kpis[obj.id] && kpis[obj.id]["editors"] && kpis[obj.id]["editors"].includes(tkns[socket.id]["username"]))) { // do not notify client about write error unless it is the first time that the user attempted writing the variable, in which case it could be important to return an error because it could due to unauthorized
									io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:xmlHttpw999.status}, (k, v) => v === undefined ? null : v)); 
								}
							}
						}
						catch(e) {
							console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Error:");
							console.log(e);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							if(!(kpis[obj.id] && kpis[obj.id]["editors"] && kpis[obj.id]["editors"].includes(tkns[socket.id]["username"]))) { // do not notify client about write error unless it is the first time that the user attempted writing the variable, in which case it could be important to return an error because it could due to unauthorized
								io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
							}
						}
					};					
					xmlHttpw999.send(JSON.stringify({ "dataTime": dataTime.getTime(), "value": obj["value"]}));
					if(config["verbose"]) {
						console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
						console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE KPI API CALL FOR "+obj["id"]));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("URL: "+config["setValue"].format(obj["id"], tkns[socket.id]["token"], sourceRequest, sourceId));
						console.log("Body:");
						console.log({ "dataTime": dataTime.getTime(), "value": obj["value"]});
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
				}
				else {
					console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR FOR "+dataObj["id"]));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					if((dataObj["id"]+"").startsWith("s4csvg_")) console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
					console.log("Payload: "+data);
					console.log("Error: invalid target (mispelled variable name/ID?)");
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR",error:"invalid target (mispelled variable name/ID?)"}, (k, v) => v === undefined ? null : v)); 
				}
			}				
			catch(e) {
				console.log(">> WRITE ERROR >>>>>>>>>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"WRITE ERROR FOR "+dataObj["id"]));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				if((dataObj["id"]+"").startsWith("s4csvg_")) console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("write",JSON.stringify({event: "write", request: data, status:"ERROR", error:e.message}, (k, v) => v === undefined ? null : v)); 
			}
		});
		
		socket.on("subscribe", function(data) { // a lot of what was said for "read" applies, the main difference is that here, in subscription object, isActive = true, because we not only have to track if the user is authorized, we actually have to entitle her to receive updates 
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: subscribe >>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST SUBSCRIBE"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: subscribe");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				if(!clni[socket.id]) clni[socket.id] = [data]; else if(!clni[socket.id].includes(data)) clni[socket.id].push(data);  // track for cleaning on socket session close
				if(data.startsWith("shared_")) { // if the subscription is for an shared variable
					if(!shared[data]) shared[data] = {}; // build empty in-memory copy of the variable to keep track of the subscription (values will arrive, maybe)
					if(!shared[data]["subscriptions"]) shared[data]["subscriptions"] = [];
					if(!shared[data]["subscriptions"].includes(socket.id)) { 
						shared[data]["subscriptions"].push(socket.id);	
					} 					
					io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // confirm
					if(config["kafka"]["enable"]["shared"]) listenBroker(data);
					if(config["verbose"]) {
						console.log(">> SUBSCRIBE OK >>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE OK FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("For: "+data);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
					try {
						if(shared[data]["value"] !== undefined && shared[data]["value"] !== null) { // if an in-memory copy of the variable already exists with its value, deliver it to the new subscriber 
							var lastValue = shared[data]["value"];
							try { lastValue = JSON.parse(lastValue); } catch(me) {}
							io.in(socket.id).emit("update "+shared[data]["id"], JSON.stringify({ 
								event: "update "+shared[data]["id"],
								id: shared[data]["id"], 
								lastValue: lastValue, 
								timestamp: shared[data]["timestamp"] 
							}, (k, v) => v === undefined ? null : v)); 
							if(config["verbose"]) {
								console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERED FOR "+shared[data]["id"]));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log({ 
									event: "update "+shared[data]["id"],
									id: shared[data]["id"], 
									lastValue: shared[data]["value"], 
									timestamp: shared[data]["timestamp"] 
								});
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
						}
					}
					catch(e) {
						console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERY ERROR FOR "+shared[data]["id"]));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("It was not possible to deliver the below object to the above addressee");
						console.log({ 
							event: "update "+shared[data]["id"],
							id: shared[data]["id"], 
							lastValue: shared[data]["value"], 
							timestamp: shared[data]["timestamp"] 
						});
						console.log("The occurred exception follows: ");
						console.log(e);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
				}
				else if(data.startsWith("s4csvg_")) { // if the subscription is for a non-mapped variable
					if(syns[socket.id]["loading"]) {
						console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Synoptic is loading, please wait.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"Synoptic is loading, please wait."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!syns[socket.id]) { // fail if no current synoptic specified
						console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Not binded to a synoptic.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"Bind to a synoptic first, through the \"display\" event."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!(syns[socket.id] && syns[socket.id]["mappings"] && syns[socket.id]["mappings"]["input"] && syns[socket.id]["mappings"]["input"][data])) { // fail if a non-mapped variable with the specified name does not exist for reading in current synoptic
						console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: variable not found, maybe a typo in variable name");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"Non-mapped variable \""+data+"\" not found in current synoptic. Maybe a typo in variable name?"}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!vars[data]) vars[data] = {}; // build empty in-memory copy of the variable to keep track of the subscription (values will arrive, maybe)
					if(!vars[data][syns[socket.id]["synoptic"]]) { 
						vars[data][syns[socket.id]["synoptic"]] = { id: data, value: null, timestamp: null, subscriptions: [socket.id] }; 
					}
					else { 
						if(!vars[data][syns[socket.id]["synoptic"]]["subscriptions"].includes(socket.id)) { 
							vars[data][syns[socket.id]["synoptic"]]["subscriptions"].push(socket.id);	
						} 
					}
					io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // confirm
					if(config["kafka"]["enable"]["nonMapped"]) listenBroker(data);
					if(config["verbose"]) {
						console.log(">> SUBSCRIBE OK >>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE OK FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("For: "+data);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
					try {
						if(vars[data][syns[socket.id]["synoptic"]]["value"] !== undefined && vars[data][syns[socket.id]["synoptic"]]["value"] !== null ) { // if an in-memory copy of the variable already exists with its value, deliver it to the new subscriber 
							var lastValue = vars[data][syns[socket.id]["synoptic"]]["value"];
							try { lastValue = JSON.parse(lastValue); } catch(me) {}
							io.in(socket.id).emit("update "+vars[data][syns[socket.id]["synoptic"]]["id"], JSON.stringify({ 
								event: "update "+vars[data][syns[socket.id]["synoptic"]]["id"],
								id: vars[data][syns[socket.id]["synoptic"]]["id"], 
								lastValue: lastValue,
								timestamp: vars[data][syns[socket.id]["synoptic"]]["timestamp"] 
							}, (k, v) => v === undefined ? null : v)); 
							if(config["verbose"]) {
								console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERED FOR "+vars[data][syns[socket.id]["synoptic"]]["id"]));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log({ 
									event: "update "+vars[data][syns[socket.id]["synoptic"]]["id"],
									id: vars[data][syns[socket.id]["synoptic"]]["id"], 
									lastValue: vars[data][syns[socket.id]["synoptic"]]["value"], 
									timestamp: vars[data][syns[socket.id]["synoptic"]]["timestamp"] 
								});
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
						}
					}
					catch(e) {
						console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERY ERROR FOR "+vars[data][syns[socket.id]["synoptic"]]["id"]));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("It was not possible to deliver the below object to the above addressee");
						console.log({ 
							event: "update "+vars[data][syns[socket.id]["synoptic"]]["id"],
							id: vars[data][syns[socket.id]["synoptic"]]["id"], 
							lastValue: vars[data][syns[socket.id]["synoptic"]]["value"], 
							timestamp: vars[data][syns[socket.id]["synoptic"]]["timestamp"] 
						});
						console.log("The occurred exception follows: ");
						console.log(e);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
				}
				else if(isNaN(data)) { // if the subscription is instead for a sensor
					if(sens[data] && sens[data]["subscriptions"] && sens[data]["subscriptions"][socket.id]) { // if it is not the first time that this requester attempts accessing this sensor in current socket session
						if(sens[data]["subscriptions"][socket.id]["isAuthorized"]) { // if the requester has been already found to have granted access to the sensor
							sens[data]["subscriptions"][socket.id]["isActive"] = true; // just switch the subscription to active
							io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // and confirm			
							if(config["kafka"]["enable"]["sensors"]) listenBroker(data);
							if(config["verbose"]) {
								console.log(">> SUBSCRIBE OK >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE OK FOR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
								console.log("For: "+data);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
							try {
								if(sens[data]["value"] !== null && sens[data]["value"] !== undefined ) { // if an in-memory copy of the sensor exists and it has a value, deliver the value to the new subscriber
									var lastValue = sens[data]["value"];
									try { lastValue = JSON.parse(lastValue); } catch(me) {}
									io.in(socket.id).emit("update "+data, JSON.stringify({ 
										event: "update "+data,
										id: data, 
										lastValue: lastValue, 
										timestamp: sens[data]["timestamp"] 
									}, (k, v) => v === undefined ? null : v)); 
									if(config["verbose"]) {
										console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERED FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log({ 
											event: "update "+data,
											id: data, 
											lastValue: sens[data]["value"], 
											timestamp: sens[data]["timestamp"] 
										});
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}
							}
							catch(e) {
								console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERY ERROR FOR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Error: it was not possible to deliver the below object to the above addressee");
								console.log({ 
									event: "update "+data,
									id: data, 
									lastValue: sens[data]["value"], 
									timestamp: sens[data]["timestamp"] 
								});
								console.log("The occurred exception follows: ");
								console.log(e);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
						}
						else {
							console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
							console.log("For: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
						}
					}	
					else { // if it is the first time that the requester attempts accessing the sensor			
						// we check to see if the requester is authorized to access the sensor (different calls for authenticated vs non-authenticated requesters)
						var chkUrl = null;
						if(tkns[socket.id]) chkUrl = config["getOneSensorValue"].format(data.split(" ")[0],data.split(" ")[1],tkns[socket.id]["token"]); 
						else chkUrl =  config["getOnePublicSensorValue"].format(data.split(" ")[0],data.split(" ")[1]); 
						var xmlHttpChkc = new XMLHttpRequest();
						xmlHttpChkc.open( "GET", chkUrl, true);
						if(config["verbose"]) {
							console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"SENSOR API CALL"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("URL: "+chkUrl);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						xmlHttpChkc.onreadystatechange = function() {	
							try {
								if(xmlHttpChkc.readyState < 4) return;
								if(config["verbose"]) {
									console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
									console.log("Summary: "+logSummary(new Date(),socket.id,"SENSOR API RESPONSE "+xmlHttpChkc.status));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Status: "+xmlHttpChkc.status)
									console.log(xmlHttpChkc.responseText);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}	
								var isAuthorized = xmlHttpChkc.status == 200; // whichever the case is, keep track of the request and of its outcome (authorized or not), to avoid further requests
								var value = null;
								var timestamp = null;
								if(isAuthorized) { // if authorized get value
									if(JSON.parse(xmlHttpChkc.responseText)["realtime"]["results"]) { // if the sensor actually exists (it could be that the device exists and the requester is granted, but the sensor name is mispelled, for example)
										JSON.parse(xmlHttpChkc.responseText)["realtime"]["results"]["bindings"].forEach(function(binding) { 
											value = binding[data.split(" ")[1]]["value"]; 
											timestamp = new Date(binding["measuredTime"]["value"]).getTime();
										});	
									}
									else {
										console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Payload: "+data);
										console.log("Error: No value. Sensor is missing or not working.");
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"No value. Sensor is missing or not working."}, (k, v) => v === undefined ? null : v)); 
										return;
									}
								}
								if(!sens[data]) { // if no in-memory copy of the sensor exists, build it
									var subscriptions = {};
									subscriptions[socket.id] = { isAuthorized: isAuthorized, isActive: isAuthorized };
									sens[data] = { 
										id: data,
										value: value, 
										timestamp: timestamp, 
										subscriptions: subscriptions
									}; 
								}
								else { // if an in-memory copy of the sensor exists, just add the subscription request
									if(!Object.keys(sens[data]["subscriptions"]).includes(socket.id)) { 
										sens[data]["subscriptions"][socket.id] = { isAuthorized: isAuthorized, isActive: isAuthorized }; 
									} 
								}
								if(isAuthorized) { 
									io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));
									if(config["kafka"]["enable"]["sensors"]) listenBroker(data);
									if(config["verbose"]) {
										console.log(">> SUBSCRIBE OK >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE OK FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
										console.log("For: "+data);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
									try { // since it is authorized, if an in-memory copy exists of the sensor and it has a value, provide it back to the new subscriber
										if(sens[data]["value"] !== null && sens[data]["value"] !== undefined) {
											var lastValue = sens[data]["value"];
											try { lastValue = JSON.parse(lastValue); } catch(me) {}
											io.in(socket.id).emit("update "+data, JSON.stringify({ 
												event: "update "+data,
												id: data, 
												lastValue: lastValue, 
												timestamp: sens[data]["timestamp"] 
											}, (k, v) => v === undefined ? null : v)); 
											if(config["verbose"]) {
												console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERED FOR "+data));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socket.id);
												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
												console.log({ 
													event: "update "+data,
													id: data, 
													lastValue: sens[data]["value"], 
													timestamp: sens[data]["timestamp"] 
												});
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										}		
									}
									catch(e) {
										console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERY ERROR FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Error:  it was not possible to deliver the below oject to the above addressee");
										console.log({ 
											event: "update "+data,
											id: data, 
											lastValue: sens[data]["value"], 
											timestamp: sens[data]["timestamp"] 
										});
										console.log("The occurred exception follows: ");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}
								else {
									console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
									console.log("For: "+data);
									console.log("Error: unauthorized");
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
								}
							}
							catch(e) {
								console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
								console.log("For: "+data);
								console.log("Error:");
								console.log(e);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
							}
						};
						xmlHttpChkc.send(null);
					}
				}
				else { // if the subscription is for a KPI
					if(kpis[data] && kpis[data]["subscriptions"] && kpis[data]["subscriptions"][socket.id]) { // if it is not the first time that the requester tries accessing the variable in this socket session
						if(kpis[data]["subscriptions"][socket.id]["isAuthorized"]) { // if it has already found to have granted access
							kpis[data]["subscriptions"][socket.id]["isActive"] = true; // just switch subscription to on
							io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 	 // and confirm						
							if(config["kafka"]["enable"]["myKPIs"]) listenBroker("kpi-"+data);
							if(config["verbose"]) {
								console.log(">> SUBSCRIBE OK >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE OK FOR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
								console.log("For: "+data);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
							try {
								if(kpis[data]["value"] !== null && kpis[data]["value"] !== undefined) { // if an in-memory copy of the variable exists and it has a value, since it is authorized, deliver the value back to the new subscriber
									var lastValue = kpis[data]["value"];
									try { lastValue = JSON.parse(lastValue); } catch(me) {}
									io.in(socket.id).emit("update "+data, JSON.stringify({ 
										event: "update "+data,
										id: data, 
										lastValue: lastValue, 
										timestamp: kpis[data]["timestamp"] 
									}, (k, v) => v === undefined ? null : v)); 
									if(config["verbose"]) {
										console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERED FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log({ 
											event: "update "+data,
											id: data, 
											lastValue: kpis[data]["value"], 
											timestamp: kpis[data]["timestamp"] 
										});
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}	
							}
							catch(e) {
								console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERY ERROR FOR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("Error: it was not possible to deliver the below object to the above addressee");
								console.log({ 
									event: "update "+data,
									id: data, 
									lastValue: kpis[data]["value"], 
									timestamp: kpis[data]["timestamp"] 
								});
								console.log("The occurred exception follows: ");
								console.log(e);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
						}
						else {
							console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
							console.log("For: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
						}
					}	
					else {	// if it is the first time that the requester tries accessing the KPI in this socket session
						// we have to verify if she is authorized
						var chkUrl = null;
						if(tkns[socket.id]) chkUrl = config["getOneKpiValue"].format(data,tkns[socket.id]["token"],sourceRequest,sourceId); 
						else chkUrl =  config["getOnePublicKpiValue"].format(data,sourceRequest,sourceId); 
						var xmlHttpChkb = new XMLHttpRequest();
						xmlHttpChkb.open( "GET", chkUrl, true);
						if(config["verbose"]) {
							console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
							console.log("Summary: "+logSummary(new Date(),socket.id,"GET KPI VALUE API CALL"));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("URL: "+chkUrl);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						xmlHttpChkb.onreadystatechange = function() {	
							try {
								if(xmlHttpChkb.readyState < 4) return;
								if(config["verbose"]) {
									console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
									console.log("Summary: "+logSummary(new Date(),socket.id,"GET KPI VALUE API RESPONSE "+xmlHttpChkb.status));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Status: "+xmlHttpChkb.status)
									console.log(xmlHttpChkb.responseText);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}	
								var isAuthorized = xmlHttpChkb.status == 200; // we keep track of the request and its outcome (authorized or not) in any case for avoiding further requests
								var value = null;
								var timestamp = null;
								if(isAuthorized) {
									JSON.parse(xmlHttpChkb.responseText).forEach(function(xmlHttp4eVal) { 
										value = xmlHttp4eVal["value"]; 
										timestamp = xmlHttp4eVal["dataTime"]; 
									});
								}								
								if(!kpis[data]) { // we build an in-memory copy of the KPI if it does not already exist
									var subscriptions = {};
									subscriptions[socket.id] = { isAuthorized: isAuthorized, isActive: isAuthorized };
									kpis[data] = { 
										id: data,
										value: value, 
										timestamp: timestamp, 
										subscriptions: subscriptions
									}; 
								}
								else { // or we just update subscriptions if an in-memory copy of the KPI already exists
									if(!Object.keys(kpis[data]["subscriptions"]).includes(socket.id)) { 
										kpis[data]["subscriptions"][socket.id] = { isAuthorized: isAuthorized, isActive: isAuthorized }; 
									} 
								}
								if(isAuthorized) { 
									io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // confirm subscription							
									if(config["kafka"]["enable"]["myKPIs"]) listenBroker("kpi-"+data);
									if(config["verbose"]) {
										console.log(">> SUBSCRIBE OK >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE OK FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
										console.log("For: "+data);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
									try {
										if(kpis[data]["value"] !== null && kpis[data]["value"] !== undefined) { // since it is authorized, if an in-memory copy of the KPI exists and it has a value, provide it back to the new subscriber
											var lastValue = kpis[data]["value"];
											try { lastValue = JSON.parse(lastValue); } catch(me) {}
											io.in(socket.id).emit("update "+data, JSON.stringify({ 
												event: "update "+data,
												id: data, 
												lastValue: lastValue, 
												timestamp: kpis[data]["timestamp"] 
											}, (k, v) => v === undefined ? null : v)); 
											if(config["verbose"]) {
												console.log(">> UPDATE DELIVERED >>>>>>>>>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERED FOR "+data));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socket.id);
												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
												console.log({ 
													event: "update "+data,
													id: data, 
													lastValue: kpis[data]["value"], 
													timestamp: kpis[data]["timestamp"] 
												});
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										}
										else {
											if(config["verbose"]) {
												console.log(">> UPDATE NOT DELIVERED DUE TO NO VALUE >>>>>>>>>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE NOT DELIVERED NO VALUE FOR "+data));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socket.id);
												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
												console.log("It seems that no value was ever set for the variable to which the user has just subscribed");
												console.log(kpis[data]);
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										}
									}
									catch(e) {
										console.log(">> UPDATE DELIVERY ERROR >>>>>>>>>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"UPDATE DELIVERY ERROR FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Error: it was not possible to deliver the below object to the above addressee");
										console.log({ 
											event: "update "+data,
											id: data, 
											lastValue: kpis[data]["value"], 
											timestamp: kpis[data]["timestamp"] 
										});
										console.log("The occurred exception follows: ");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}
								else {
									console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
									console.log("For: "+data);
									console.log("Error: unauthorized");
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
								}
							}
							catch(e) {
								console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>>>>");
								console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);									
								console.log("For: "+data);
								console.log("Error:");
								console.log(e);
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
							}
						};
						xmlHttpChkb.send(null);
					}
				}
			}
			catch(e) {					
				console.log(">> SUBSCRIBE ERROR >>>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"SUBSCRIBE ERROR FOR "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("subscribe",JSON.stringify({event: "subscribe", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
			}
		});
		
		socket.on("unsubscribe", function(data) { // this event is used by clients for stopping receiving updates for a given variable for which they had subscribed in current socket session
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: unsubscribe >>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST UNSUBSCRIBE FOR "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: unsubscribe");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				if(data.startsWith("shared_")) { // If the subscription to be canceled concerns a shared variable
					if(shared[data] && shared[data]["subscriptions"] && shared[data]["subscriptions"].includes(socket.id)) { // if a subscription actually exists of the requester for this variable
						shared[data]["subscriptions"].splice(shared[data]["subscriptions"].indexOf(socket.id),1); // delete
						io.in(socket.id).emit("unsubscribe", JSON.stringify({event: "unsubscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // and confirm
						if(config["verbose"]) {
							console.log(">> UNSUBSCRIBE OK >>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("For: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					else {
						console.log(">> UNSUBSCRIBE ERROR >>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("For: "+data);
						console.log("Error: subscription not found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("unsubscribe",JSON.stringify({event: "unsubscribe", request: data, status:"ERROR",error:"subscription not found"}, (k, v) => v === undefined ? null : v)); 
					}							
				}
				else if(data.startsWith("s4csvg_")) { // If the subscription to be canceled concerns a non-mapped variable
					if(syns[socket.id]["loading"]) {
						console.log(">> UNSUBSCRIBE ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Synoptic is loading, please wait.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "unsubscribe", request: data, status:"ERROR",error:"Synoptic is loading, please wait."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(vars[data] && syns[socket.id] && syns[socket.id]["synoptic"] && vars[data][syns[socket.id]["synoptic"]] && vars[data][syns[socket.id]["synoptic"]]["subscriptions"] && vars[data][syns[socket.id]["synoptic"]]["subscriptions"].includes(socket.id)) { // if a subscription actually exists of the requester for this variable
						vars[data][syns[socket.id]["synoptic"]]["subscriptions"].splice(vars[data][syns[socket.id]["synoptic"]]["subscriptions"].indexOf(socket.id),1); // delete
						io.in(socket.id).emit("unsubscribe", JSON.stringify({event: "unsubscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // and confirm
						if(config["verbose"]) {
							console.log(">> UNSUBSCRIBE OK >>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
							console.log("For: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					else {
						console.log(">> UNSUBSCRIBE ERROR >>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("For: "+data);
						console.log("Error: subscription not found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("unsubscribe",JSON.stringify({event: "unsubscribe", request: data, status:"ERROR",error:"subscription not found"}, (k, v) => v === undefined ? null : v)); 
					}							
				}
				else if(isNaN(data)) { // if the subscription to be canceled concerns a sensor
					if(sens[data] && sens[data]["subscriptions"][socket.id] && sens[data]["subscriptions"][socket.id]["isAuthorized"]) { // if a subscription actually exists of the requester for this variable
						sens[data]["subscriptions"][socket.id]["isActive"] = false; // just make the subscription inactive so that you do not loose information about authorization
						io.in(socket.id).emit("unsubscribe",JSON.stringify({event: "unsubscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // and confirm
						var nobodyLeft = true;
						Object.keys(sens[data]["subscriptions"]).forEach(function(socketid){
							if(sens[data]["subscriptions"][socketid]["isActive"]) {
								nobodyLeft = false;
							}
						});
						if(nobodyLeft) {
							var topic = data.toKafkaTopic();
							if(ksbs[topic]) ksbs[topic]["consumer"].close(function(err, message) {
								try {
									if(!err) {
										if(config["verbose"]) {
											console.log(">> KAFKA CONSUMER CLOSED >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),"--","KAFKA CONSUMER CLOSED"));
											console.log("Time: "+new Date().toString());
											console.log("Topic: "+topic);
											console.log("Message: Nobody interested in this topic out there after this unsubscribe. Kafka Consumer has been closed and all associated metadata deleted.");
											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
										delete ksbs[topic];
									}
									else {
										console.log(">> UNSUBSCRIBE NON-CRITICAL ERROR >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),"--","UNSUBSCRIBE NON-CRITICAL ERROR UNABLE TO CLOSE KAFKA CONSUMER"));
										console.log("Time: "+new Date().toString());
										console.log("Error: unable to close Kafka consumer");
										console.log("Kafka error: ");
										console.log(err);
										console.log("Kafka message: ");
										console.log(message);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
								}
								catch(e) {
									console.log(">> UNSUBSCRIBE NON-CRITICAL ERROR >>>>>>>");
									console.log("Summary: "+logSummary(new Date(),"--","UNSUBSCRIBE NON-CRITICAL ERROR UNABLE TO CLOSE KAFKA CONSUMER"));
									console.log("Time: "+new Date().toString());
									console.log("Error: unable to close Kafka consumer due to exception");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
								}								
							});							
						}
						if(config["verbose"]) {
							console.log(">> UNSUBSCRIBE OK >>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("For: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					else {
						console.log(">> UNSUBSCRIBE ERROR >>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("For: "+data);
						console.log("Error: subscription not found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("unsubscribe",JSON.stringify({event: "unsubscribe", request: data, status:"ERROR",error:"subscription not found"}, (k, v) => v === undefined ? null : v)); 
					}
				}
				else { // if the subscription to be canceled concerns a KPI
					if(kpis[data] && kpis[data]["subscriptions"] && kpis[data]["subscriptions"][socket.id] && kpis[data]["subscriptions"][socket.id]["isAuthorized"]) { // if a subscription actually exists of the requester for this variable
						kpis[data]["subscriptions"][socket.id]["isActive"] = false; // just make the subscription inactive so that you do not loose information about authorization
						io.in(socket.id).emit("unsubscribe",JSON.stringify({event: "unsubscribe", request: data, status:"OK"}, (k, v) => v === undefined ? null : v));  // and confirm
						if(config["verbose"]) {
							console.log(">> UNSUBSCRIBE OK >>>>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("For: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
					}
					else {
						console.log(">> UNSUBSCRIBE ERROR >>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("For: "+data);
						console.log("Error: subscription not found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");							
						io.in(socket.id).emit("unsubscribe",JSON.stringify({event: "unsubscribe", request: data, status:"ERROR",error:"subscription not found"}, (k, v) => v === undefined ? null : v)); 
					}
				}
				
			}
			catch(e) {
				console.log(">> UNSUBSCRIBE ERROR >>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"UNSUBSCRIBE ERROR FOR "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("unsubscribe", JSON.stringify({event: "unsubscribe", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
			}					
		});
		
		socket.on("disconnect", function(){		
			try {
				// cleanup everything related to the socket
				delete tkns[socket.id];
				delete syns[socket.id];
				if(clni[socket.id]) clni[socket.id].forEach(function(id){
					try {
						if(id.startsWith("shared_")) { // shared variable
							if(shared[id] && shared[id]["subscriptions"] && shared[id]["subscriptions"].includes(socket.id)) { shared[id]["subscriptions"].splice(shared[id]["subscriptions"].indexOf(socket.id),1); }
						}
						else if(id.startsWith("s4csvg_")) { // non-mapped variable
							if(vars[id] && syns[socket.id] && syns[socket.id]["synoptic"] && vars[id][syns[socket.id]["synoptic"]] && vars[id][syns[socket.id]["synoptic"]]["subscriptions"].includes(socket.id)) { vars[id][syns[socket.id]["synoptic"]]["subscriptions"].splice(vars[id][syns[socket.id]["synoptic"]]["subscriptions"].indexOf(socket.id),1); }
						}
						else if(isNaN(id)) { // sensor
							delete sens[id]["subscriptions"][socket.id];
							var nobodyLeft = true;
							Object.keys(sens[id]["subscriptions"]).forEach(function(socketid){
								if(sens[id]["subscriptions"][socketid]["isActive"]) {
									nobodyLeft = false;
								}
							});
							if(nobodyLeft) {
								var topic = id.toKafkaTopic();
								if(ksbs[topic]) ksbs[topic]["consumer"].close(function(err, message) {
									try {
										if(!err) {
											if(config["verbose"]) {
												console.log(">> KAFKA CONSUMER CLOSED >>>>>>>");
												console.log("Summary: "+logSummary(new Date(),"--","KAFKA CONSUMER CLOSED"));
												console.log("Time: "+new Date().toString());												
												console.log("Topic: "+topic);
												console.log("Message: Nobody interested in this topic out there after this disconnect. Kafka Consumer has been closed and all associated metadata deleted.");
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
											delete ksbs[topic];
										}
										else {
											console.log(">> UNSUBSCRIBE NON-CRITICAL ERROR >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),"--","UNSUBSCRIBE NON-CRITICAL ERROR"));
											console.log("Time: "+new Date().toString());
											console.log("Error: unable to close Kafka consumer");
											console.log("Kafka error: ");
											console.log(err);
											console.log("Kafka message: ");
											console.log(message);
											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
									}
									catch(e) {
										console.log(">> UNSUBSCRIBE NON-CRITICAL ERROR >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),"--","UNSUBSCRIBE NON-CRITICAL ERROR"));
										console.log("Time: "+new Date().toString());
										console.log("Error: unable to close Kafka consumer due to exception");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}								
								});							
							}
						}
						else { // KPI
							delete kpis[id]["subscriptions"][socket.id];
						}
					}
					catch(e) {
						console.log(">> ERROR WHILE CLEANING BEFORE DISCONNECTING >>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"ERROR WHILE CLEANING BEFORE DISCONNECTING"));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Error:");
						console.log(e);
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
				});						
				if(config["verbose"]) {
					console.log(">> DISCONNECT OK >>>>>>>>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"DISCONNECT OK"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
			}
			catch(e) {
				console.log(">> DISCONNECT ERROR >>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"DISCONNECT ERROR"));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
			}
		});	
		
		socket.on("clear", function(data){
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: clear >>>>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST CLEAR FOR "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: clear");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				if(!tkns[socket.id]) { // if the requester is not authenticated, fail
					console.log(">> CLEAR ERROR >>>>>>>>>>>>>>>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Error: missing authentication");
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
					return;
				}
				if(data.startsWith("shared_")) {
					if(shared[data]) {
						if(tkns[socket.id] && tkns[socket.id]["roles"] && tkns[socket.id]["roles"].includes("RootAdmin") ) {
							delete shared[data];	
							connection.query(
								'delete from SynopticSrvVars where name = ?', 
								[ data ],
								function (error, results) { 
									try { 
										if (error) { 									
											console.log(">> DB ERROR >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"DB DELETE ERROR WHILE CLEARING "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("Could not clear MySQL database from variable "+data+" due to the following error:");
											console.log(error);
											console.log("<<<<<<<<<<<<<<<<<<<\n\n");
										}
										else if(config["verbose"]) {
											console.log(">> DB CLEAR OK >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"DB CLEAR OK FOR "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("Variable "+data+" successfully removed from MySQL database");
											console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
									} catch(e){
										console.log(">> CLEAR ERROR >>>>>>>");										
										console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Could not clear MySQL database from variable "+data+" due to the following exception:");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<\n\n");
									} 
								}
							);	
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 					
							console.log(">> CLEAR OK >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Variable: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");						
						}
						else {
							console.log(">> CLEAR ERROR >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Variable: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 						
						}
					}
					else {
						console.log(">> CLEAR ERROR >>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Variable: "+data);
						console.log("Error: Not Found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
						io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Not found"}, (k, v) => v === undefined ? null : v)); 
					}
				}
				else if(data.startsWith("s4csvg_")) {
					if(syns[socket.id]["loading"]) {
						console.log(">> CLEAR ERROR >>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Synoptic: "+(syns[socket.id]?syns[socket.id]["synoptic"]:"null"));
						console.log("Payload: "+data);
						console.log("Error: Synoptic is loading, please wait.");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("write",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Synoptic is loading, please wait."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(!syns[socket.id]) {
						console.log(">> CLEAR ERROR >>>>>>>>>>>>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Error: synoptic not specified, should have sent a display event first");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Bind to a synoptic through the display event first."}, (k, v) => v === undefined ? null : v)); 
						return;
					}
					if(vars[data] && syns[socket.id] && syns[socket.id]["synoptic"] && vars[data][syns[socket.id]["synoptic"]]) {
						if(syns[socket.id]["writable"] || ( tkns[socket.id] && tkns[socket.id]["roles"] && tkns[socket.id]["roles"].includes("RootAdmin") ) ) {
							delete vars[data];		
							connection.query(
								'delete from SynopticSrvVars where name = ?', 
								[ data ],
								function (error, results) { 
									try { 
										if (error) { 									
											console.log(">> DB ERROR >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"DB DELETE ERROR WHILE CLEARING "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("Could not clear MySQL database from variable "+data+" due to the following error:");
											console.log(error);
											console.log("<<<<<<<<<<<<<<<<<<<\n\n");
										}
										else if(config["verbose"]) {
											console.log(">> DB CLEAR OK >>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"DB CLEAR OK "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("Variable "+data+" successfully removed from MySQL database");
											console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
									} catch(e){
										console.log(">> CLEAR ERROR >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Could not clear MySQL database from variable "+data+" due to the following exception:");
										console.log(e);
										console.log("<<<<<<<<<<<<<<<<<<<\n\n");
									} 
								}
							);	
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 					
							console.log(">> CLEAR OK >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Variable: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");						
						}
						else {
							console.log(">> CLEAR ERROR >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Variable: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 						
						}
					}
					else {
						console.log(">> CLEAR ERROR >>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Variable: "+data);
						console.log("Error: Not Found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
						io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Not found"}, (k, v) => v === undefined ? null : v)); 
					}
				}
				else if(!isNaN(data)) {
					if(kpis[data]) {
						if( ( kpis[data]["editors"] && tkns[socket.id] && kpis[data]["editors"].includes(tkns[socket.id]["username"]) ) || tkns[socket.id]["roles"].includes("RootAdmin")) {
							delete kpis[data];
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 							
							console.log(">> CLEAR OK >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);							
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("KPI: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");	
						}
						else {
							var xmlHttpAuth12a = new XMLHttpRequest();
							xmlHttpAuth12a.open( "GET", config["personalDataPrivateApi"].format(tkns[socket.id]["token"],sourceRequest,sourceId), true);
							if(config["verbose"]) {
								console.log(">> API CALL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
								console.log("Summary: "+logSummary(new Date(),socket.id,"PERSONAL DATA API CALL"));
								console.log("Time: "+new Date().toString());
								console.log("Socket: "+socket.id);
								if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
								console.log("URL: "+config["personalDataPrivateApi"].format(tkns[socket.id]["token"],sourceRequest,sourceId));
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
							xmlHttpAuth12a.onreadystatechange = function() {
								try {
									if(xmlHttpAuth12a.readyState < 4) return;
									if(config["verbose"]) {
										console.log(">> API RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"); 
										console.log("Summary: "+logSummary(new Date(),socket.id,"PERSONAL DATA API RESPONSE "+xmlHttpAuth12a.status));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Status: "+xmlHttpAuth12a.status)
										console.log(xmlHttpAuth12a.responseText);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									}
									if(xmlHttpAuth12a.status == 200) {
										var responseJson12a = JSON.parse(xmlHttpAuth12a.responseText);
										var isOwner = false;
										responseJson12a.forEach(function(ownElmt12a){
											try {
												if(ownElmt12a["id"] == data) {
													isOwner = true;									
												}
											}
											catch(e) {
												console.log(">> CLEAR ERROR >>>>>>>");
												console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
												console.log("Time: "+new Date().toString());
												console.log("Socket: "+socket.id);
												if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
												console.log("Payload: "+data);
												console.log("Error:");
												console.log(e);
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
												io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
											}											
										});	
										if(isOwner) {
											delete kpis[data];
											io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 							
											console.log(">> CLEAR OK >>>>>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR OK FOR "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);							
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("KPI: "+data);
											console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");	
										}
										else {
											console.log(">> CLEAR ERROR >>>>>>>>>>");
											console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
											console.log("Time: "+new Date().toString());
											console.log("Socket: "+socket.id);
											if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
											console.log("KPI: "+data);
											console.log("Error: unauthorized");
											console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
											io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
										}
									}
									else {
										console.log(">> CLEAR ERROR >>>>>>>");
										console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
										console.log("Time: "+new Date().toString());
										console.log("Socket: "+socket.id);
										if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
										console.log("Payload: "+data);
										console.log("Error: Personal Data API response code "+xmlHttpAuth12a.status);
										console.log(xmlHttpAuth12a.responseText);
										console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Personal Data API response code "+xmlHttpAuth12a.status}, (k, v) => v === undefined ? null : v)); 
									}
								}
								catch(e) {
									console.log(">> CLEAR ERROR >>>>>>>");
									console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
									console.log("Time: "+new Date().toString());
									console.log("Socket: "+socket.id);
									if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
									console.log("Payload: "+data);
									console.log("Error:");
									console.log(e);
									console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
									io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:e.message}, (k, v) => v === undefined ? null : v)); 
								}
							};
							xmlHttpAuth12a.send(null);
						}
					}
					else {
						console.log(">> CLEAR ERROR >>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("KPI: "+data);
						console.log("Error: Not Found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
						io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Not found"}, (k, v) => v === undefined ? null : v)); 
					}
				}
				else {
					if(sens[data]) {
						if(tkns[socket.id]["roles"] && tkns[socket.id]["roles"].includes("RootAdmin")) {
							delete sens[data];
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 
							console.log(">> CLEAR OK >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR OK FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Sensor: "+data);
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");	
						}
						else {
							console.log(">> CLEAR ERROR >>>>>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Sensor: "+data);
							console.log("Error: unauthorized");
							console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
							io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
						}
					}
					else {
						console.log(">> CLEAR ERROR >>>>>>>>>>");
						console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
						console.log("Time: "+new Date().toString());
						console.log("Socket: "+socket.id);
						if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
						console.log("Sensor: "+data);
						console.log("Error: Not Found");
						console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
						io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:"Not found"}, (k, v) => v === undefined ? null : v)); 
					}
				}
			}
			catch(e) {
				console.log(">> CLEAR ERROR >>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"CLEAR ERROR FOR "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Request: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
				io.in(socket.id).emit("clear",JSON.stringify({event: "clear", request: data, status:"ERROR",error:e}, (k, v) => v === undefined ? null : v)); 
			}
		});
		
		socket.on("help", function(){
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: help >>>>>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST HELP"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: help");
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				var quickGuide = `Below here is a list of events that a client can deliver to this socket server and their meaning and usage:
	- authenticate: through this event the client delivers an accessToken that will be user for accessing private data. The content attached to the event is expected to be the access token itself, not wrapped in a json or other.
	- setSrcReq: through this event the client specifies the category of applications to which it belongs, i.e. synoptic, iotapp, ... The expected content attached to the event is a plain string that will be used for filling the sourceRequest parameter when calling APIs.
	- setSrcId: through this event the client uniquely identifies itself within the category of applications specified through the setSrcReq event. The expected content attached to the event is a plain string that will be used for filling the sourceId parameter when calling APIs.
	- display: through this event the client gets metadata about a synoptic. If the synoptic is not public, authentication is required, see authenticate event. The content attached to the event is expected to be the ID of the synoptic, not wrapped in any way.
	- subscribe: through this event the client requests to receive updates for a given variable at real-time, as soon as the value of the variable changes. See the read event below for prerequisites. The content attached to the event is expected to be the name of the non-mapped variable, or the ID of the KPI, or the URI of the device followed by a blank space and the name of the sensor of interest.
	- unsubscribe: through this event the client cancels a subscription. The content attached to the event is expected to be the name of the non-mapped variable, or the ID of the KPI, or the URI of the device followed by a blank space and the name of the sensor of interest.
	- read: through this event the client makes a one-time request for the value of a variable. For accessing non-mapped variables, the client must be binded to a synoptic, see display event for this. For accessing private variables the client must be authenticated, see authenticate event for this. The content attached to the event is expected to be the name of the non-mapped variable, or the ID of the KPI, or the URI of the device followed by a blank space and the name of the sensor of interest.
	- write: through this event the client writes a non-mapped variable or a KPI. See the read event for prerequisites. The content is expected to be a json with two properties: id, and value. The id is expected to be the name of the non-mapped variable, or the ID of the KPI.
	- clear: through this event the client drops the in-memory copy (cache) of a variable, including its value and permissions. Typical usage: I have edited permissions on a variable, and I want to force a new verification of permissions the first time that a user makes a request through a synoptic. Only users that have writing permissions on a variable, and root admin, can dispose the removal of the in-memory copy of it.
	- dump: through this event root admins can inspect the internal status of the socket server. Further details are kept confidential.`;
				io.in(socket.id).emit("help", JSON.stringify({event: "help", status:"OK", quickGuide:quickGuide}, (k, v) => v === undefined ? null : v)); 
			}
			catch(e) {
				console.log(">> HELP ERROR >>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"HELP ERROR"));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
				io.in(socket.id).emit("help",JSON.stringify({event: "help", status:"ERROR",error:e}, (k, v) => v === undefined ? null : v)); 
			}
		});
		
		socket.on("setSrcReq", function(data) {
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: setSrcReq >>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST SETSRCREQ"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: setSrcReq");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				sourceRequest = data;
				io.in(socket.id).emit("setSrcReq",JSON.stringify({event: "setSrcReq", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 
				if(config["verbose"]) {
					console.log(">> setSrcReq OK >>>>>>>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"SETSRCREQ OK SET TO "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Payload: "+data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
			}
			catch(e) {
				console.log(">> setSrcReq ERROR >>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"SETSRCREQ ERROR UNABLE TO SET TO "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Request: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
				io.in(socket.id).emit("setSrcReq",JSON.stringify({event: "setSrcReq", request: data, status:"ERROR",error:e}, (k, v) => v === undefined ? null : v)); 
			}
			
		});
		
		socket.on("setSrcId", function(data) {
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: setSrcId >>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST SETSRCID TO "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: setSrcReq");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				sourceId = data;
				io.in(socket.id).emit("setSrcId",JSON.stringify({event: "setSrcId", request: data, status:"OK"}, (k, v) => v === undefined ? null : v)); 
				if(config["verbose"]) {
					console.log(">> setSrcId OK >>>>>>>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"SETSRCID OK SET TO "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Payload: "+data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
			}
			catch(e) {
				console.log(">> setSrcId ERROR >>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"SETSRCID ERROR UNABLE TO SET TO "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Request: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<\n\n");			
				io.in(socket.id).emit("setSrcId",JSON.stringify({event: "setSrcId", request: data, status:"ERROR",error:e}, (k, v) => v === undefined ? null : v)); 
			}
			
		});
		
		socket.on("dump", function(data) {
			try {
				if(config["verbose"]) {
					console.log(">> CLIENT EVENT: dump >>>>>>>>>>>>>>>>>>>>>>>"); 
					console.log("Summary: "+logSummary(new Date(),socket.id,"CLIENT REQUEST DUMP"));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Event: dump");
					console.log("Attached Content:");
					console.log(data);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
				if( tkns[socket.id] && tkns[socket.id]["roles"].includes("RootAdmin") || tkns[socket.id]["username"] == "msoderi") {
					switch(data) {
						case "vars":
							console.log(vars);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", vars: vars}, (k, v) => v === undefined ? null : v)); 
							break;
						case "sens":
							console.log(sens);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", sens: sens }, (k, v) => v === undefined ? null : v)); 
							break;
						case "kpis":
							console.log(kpis);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", kpis: kpis}, (k, v) => v === undefined ? null : v)); 
							break;
						case "tkns":
							console.log(tkns);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", tkns: tkns}, (k, v) => v === undefined ? null : v)); 
							break;
						case "syns":
							console.log(syns);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", syns: syns}, (k, v) => v === undefined ? null : v)); 
							break;
						case "clni":
							console.log(clni);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", clni: clni}, (k, v) => v === undefined ? null : v)); 
							break;
						case "ksbs":
							console.log(ksbs);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", ksbs: ksbs}, (k, v) => v === undefined ? null : v)); 
							break;
						case "shared":
							console.log(shared);
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"OK", shared: shared}, (k, v) => v === undefined ? null : v)); 
							break;
						default:
							console.log(">> DUMP ERROR >>>>>>>");
							console.log("Summary: "+logSummary(new Date(),socket.id,"DUMP ERROR FOR "+data));
							console.log("Time: "+new Date().toString());
							console.log("Socket: "+socket.id);
							if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
							console.log("Payload: "+data);
							console.log("Error: invalid request");
							console.log("<<<<<<<<<<<<<<<<<<<<<\n\n");
							io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"ERROR",error:"Invalid request. Attached content should be one of: vars, sens, kpis, tkns, syns, clni, ksbs."}, (k, v) => v === undefined ? null : v)); 
							return;
							
					}
					console.log(">> DUMP OK >>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"DUMP OK FOR "+data));
					console.log("Time: "+new Date().toString());
					console.log("Requesting Socket: "+socket.id);
					if(tkns[socket.id]) console.log("Requesting User: "+tkns[socket.id]["username"]);
					console.log("Requested Internal Variable: "+data);
					console.log("Status: OK, DONE (SEE ABOVE)");
					console.log("<<<<<<<<<<<<<<<<<<\n\n");					
					return;
				}
				else {
					console.log(">> DUMP ERROR >>>>>>>");
					console.log("Summary: "+logSummary(new Date(),socket.id,"DUMP ERROR FOR "+data));
					console.log("Time: "+new Date().toString());
					console.log("Socket: "+socket.id);
					if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
					console.log("Payload: "+data);
					console.log("Error: unauthorized");
					console.log("<<<<<<<<<<<<<<<<<<<<<\n\n");
					io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"ERROR",error:"unauthorized"}, (k, v) => v === undefined ? null : v)); 
					return;
				}
			}
			catch(e) {
				console.log(">> DUMP ERROR >>>>>>>");
				console.log("Summary: "+logSummary(new Date(),socket.id,"DUMP ERROR FOR "+data));
				console.log("Time: "+new Date().toString());
				console.log("Socket: "+socket.id);
				if(tkns[socket.id]) console.log("User: "+tkns[socket.id]["username"]);
				console.log("Payload: "+data);
				console.log("Error:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<\n\n");
				io.in(socket.id).emit("dump",JSON.stringify({event: "dump", request: data, status:"ERROR",error:e}, (k, v) => v === undefined ? null : v)); 
				return;
			}
		});
		
	}
	catch(e) {
		console.log(">> CONNECTION ERROR >>>>>>>>>>");
		console.log("Summary: "+logSummary(new Date(),socket.id,"CONNECTION ERROR"));
		console.log("Error:");
		console.log(e);
		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
	}
		
});

if(config["verbose"]) {
	console.log(">> LOADING VARIABLES FROM DATABASE... >>>>>>>");
	console.log("Summary: "+logSummary(new Date(),"--","LOADING VARIABLES FROM DATABASE"));
	console.log("Time: "+new Date().toString());
	console.log("Non-mapped and shared variables are going to be loaded from the database");
	console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
}
var connection = mysql.createConnection({
	host     : config["dbHost"],
	user     : config["dbUser"],
	password : config["dbPass"],
	database : config["dbName"]
});
connection.connect();
try {
	var lastBkp = [];
	connection.query(
		'select m.* from SynopticSrvVars m join ( select name, max(timestamp) timestamp from SynopticSrvVars group by name ) s on m.name = s.name and m.timestamp = s.timestamp',
		function (error, results, fields) { 
			try { 
				if (!error) { 
					results.forEach(function(result){					
						lastBkp.push(result["id"]);
						if(config["verbose"]) {
							console.log(">> LOADING VARIABLE... >>>>>>>");
							console.log("Summary: "+logSummary(new Date(),"--","LOADED VARIABLE"));
							console.log("Time: "+new Date().toString());
							console.log(result);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						if(result["name"].startsWith("s4csvg_")) {
							if(!vars[result["name"]]) vars[result["name"]] = {};
							vars[result["name"]][result["synoptic"]] = { 
								id: result["name"], 
								value: result["type"] == "number" && !isNaN(parseFloat(result["value"]))?parseFloat(result["value"]):result["value"], 
								synoptic: result["synoptic"], 
								timestamp: result["timestamp"], 
								subscriptions: []
							};
						}
						else {
							shared[result["name"]] = { 
								id: result["name"], 
								value: result["type"] == "number" && !isNaN(parseFloat(result["value"]))?parseFloat(result["value"]):result["value"], 
								timestamp: result["timestamp"], 
								subscriptions: []
							};
						}
					});
					if(config["verbose"]) {
						console.log(">> VARIABLES LOADED SUCCESSFULLY >>>>>>>");
						console.log("Summary: "+logSummary(new Date(),"--","SUCCESSFULLY LOADED VARIABLES FROM DATABASE"));
						console.log("Time: "+new Date().toString());
						console.log("Non-mapped and shared variables have been successfully loaded from the database");
						console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
					}
					connection.query("delete from SynopticSrvVars where id not in ( "+lastBkp.join(",")+" ) ", function (error, results, fields) { 
						if(error) {
							console.log(">> DB ERROR >>>>>>>");
							console.log("Summary: "+logSummary(new Date(),"--","DB DELETE ERROR IN BACKUP CLEANING AT STARTUP"));
							console.log("Time: "+new Date().toString());
							console.log("Error occurred while cleaning up backup");
							console.log("MySql error follows:");
							console.log(error);
							console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
						}
						else {
							if(config["verbose"]) {
								console.log(">> BACKUP TABLE CLEANED >>>>>>>");
								console.log("Summary: "+logSummary(new Date(),"--","BACKUP CLEANED"));
								console.log("Time: "+new Date().toString());
								console.log("Message: old backups have been successfully removed");	
								console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
							}
							var periodicCleaning = setInterval(function() {
								var lstbkp = [];
								connection.query(
									'select m.* from SynopticSrvVars m join ( select name, max(timestamp) timestamp from SynopticSrvVars group by name ) s on m.name = s.name and m.timestamp = s.timestamp',
									function (error, results, fields) { 
										try { 
											if (!error) { 
												results.forEach(function(result){					
													lstbkp.push(result["id"]);
												});
												connection.query("delete from SynopticSrvVars where id not in ( "+lstbkp.join(",")+" ) ", function (error, results, fields) { 
													if(error) {
														console.log(">> DB ERROR >>>>>>>");
														console.log("Summary: "+logSummary(new Date(),"--","DB DELETE ERROR IN PERIODIC BACKUP CLEANING"));
														console.log("Time: "+new Date().toString());
														console.log("Error occurred while cleaning up backup");
														console.log("MySql error follows:");
														console.log(error);
														console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
													}
													else {
														console.log(">> BACKUP TABLE CLEANED >>>>>>>");
														console.log("Summary: "+logSummary(new Date(),"--","BACKUP CLEANED"));
														console.log("Time: "+new Date().toString());
														console.log("Message: old backups have been successfully removed");	
														console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
													}	
												});													
											}
											else {
												console.log(">> DB ERROR ON LOADING BACKUP FOR PERIODIC CLEANING >>>>>>>");
												console.log("Summary: "+logSummary(new Date(),"--","DB ERROR IN PERIODIC BACKUP CLEANING"));
												console.log("Time: "+new Date().toString());
												console.log("Error: Could not load non-mapped and shared variables from the database due to the following error:");
												console.log(error);
												console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
											}
										}
										catch(e) {
											console.log(">> PERIODIC CLEANING OF DB BACKUP ERROR >>>>>>>>>>>>>");
											console.log("Summary: "+logSummary(new Date(),"--","PERIODIC BACKUP CLEANING ERROR"));
											console.log("Time: "+new Date().toString());
											console.log("Error: Could not load non-mapped and shared variables from the database due to the following exception:");
											console.log(e);
											console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
										}
									}
								);
							},config["bkpCleanItvl"]);
						}
					});
				}
				else {
					console.log(">> DB ERROR ON LOADING >>>>>>>");
					console.log("Summary: "+logSummary(new Date(),"--","DB ERROR ON LOADING VARIABLES FROM DATABASE"));
					console.log("Time: "+new Date().toString());
					console.log("Error: Could not load non-mapped and shared variables from the database due to the following error:");
					console.log(error);
					console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
				}
			} catch(e) {
				console.log(">> LOADING ERROR >>>>>>>>>>>>>");
				console.log("Summary: "+logSummary(new Date(),"--","ERROR ON LOADING VARIABLES FROM DATABASE"));
				console.log("Time: "+new Date().toString());
				console.log("Error: Could not load non-mapped and shared variables from the database due to the following exception:");
				console.log(e);
				console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
			}
			
			http.listen(config["httpPort"], function(){ console.log('HTTP server listening on *:'+config["httpPort"]); });
			https.listen(config["httpsPort"], function(){ console.log('HTTPS server listening on *:'+config["httpsPort"]+"\n\n"); });
			
		}
		
	);
	
}
catch(e) {
	console.log(">> ERROR >>>>>>>");
	console.log("Summary: "+logSummary(new Date(),"--","ERROR"));
	console.log("Time: "+new Date().toString());
	console.log("Exception occurred:");
	console.log(e);
	console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n");
}