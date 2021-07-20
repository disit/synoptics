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

const LOGLEVEL_INFO = "info";
const LOGLEVEL_ERROR = "error";
const LOGLEVEL_OFF = "off";

class SIOW {

	logLevel
	attrName
	serverEndpoint	
	connPath
	connQuery	
	qryStr
	qryObj	
	staticSource
	staticDestination
	errorCallback	
	socket
	actions
	pathDataName
	instanceId
	instances
	startable
	startedCallback
	ineedthese

	log(message, level) {
		if(this.logLevel == LOGLEVEL_INFO) {
			if(typeof message !== "object") {
				console.info("SIOW> "+message);
			}
			else {
				console.info(message);
			}
		}
		else if(this.logLevel == level) {
			if(typeof message !== "object") {
				console.error("SIOW> "+message);
			}
			else {
				console.error(message);
			}
		}
	}
	
	legacy(siowObj, value) {
		try {
			var jval = JSON.parse(value);
			if(!jval.tag) return value;			
			if(siowObj.instances[siowObj.instanceId]["output"][jval.tag]) {				
				var newObj = {};
				newObj.id = siowObj.instances[siowObj.instanceId]["output"][jval.tag];
				newObj.value = jval.src;
				return JSON.stringify(newObj);
			}
			return value;
		}
		catch(e) {
			return value;
		}
	}
	
	parseQueryString() {
		var vars = this.qryStr.substring(1).split("&");
		var query_string = {};
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			var key = decodeURIComponent(pair[0]);
			var value = decodeURIComponent(pair[1]);
			if (typeof query_string[key] === "undefined") {
				query_string[key] = decodeURIComponent(value);
			} else if (typeof query_string[key] === "string") {
				var arr = [query_string[key], decodeURIComponent(value)];
				query_string[key] = arr;
			} else {
				query_string[key].push(decodeURIComponent(value));
			}
		}
		this.qryObj = query_string;
	}
	
	isStartable() {
		return this.staticSource && this.instances && this.startable;
	}
	
	getVarMap() {
		// this.instances = {};
		var siowObj = this;		
		this.socket.emit("getVariablesMapping", JSON.stringify({"instanceId": siowObj.instanceId}));		
		this.socket.on("yourVariablesMappingForSynoptic"+siowObj.instanceId, function(data){ 
			try {
				var jData = JSON.parse(data);
				if(jData.status == "OK") {						
						siowObj.instances = jData.mappings;
						siowObj.log("Variables mapping:", LOGLEVEL_INFO);
						siowObj.log(siowObj.instances, LOGLEVEL_INFO);
						if(siowObj.isStartable()) siowObj.start();
				}
				else {
						siowObj.log(data, LOGLEVEL_ERROR);
				}
			}
			catch(e) {
				siowObj.log(e, LOGLEVEL_ERROR);
			}			
		});
		if(this.isStartable()) this.start();							
	}
	
	getTpl() {									
		var siowObj = this;
		this.socket.emit("getSynopticTemplate", JSON.stringify({"instanceId": siowObj.instanceId}));		
		this.socket.on("yourTemplateForSynoptic"+siowObj.instanceId, function(data){ 
			try {
				var jData = JSON.parse(data);
				if(jData.status == "OK") {						
						siowObj.staticSource = jData.template;
						siowObj.log("template: "+siowObj.staticSource, LOGLEVEL_INFO);
						if(siowObj.isStartable()) siowObj.start();
				}
				else {
						siowObj.log(data, LOGLEVEL_ERROR);
						if(!siowObj.connQuery.includes("accessToken")) siowObj.errorCallback();
				}
			}
			catch(e) {
				siowObj.log(e, LOGLEVEL_ERROR);
			}			
		});
	}
	
	connect() {
		this.log("I am establishing a new connection",LOGLEVEL_INFO);
		this.socket = null;
		try {
			var connParams = {};
			if(this.connPath != null) connParams.path = this.connPath;
			if(this.connQuery != null) connParams.query = this.connQuery;
			if(this.serverEndpoint == null) {				
				if(connParams.hasOwnProperty("path") || connParams.hasOwnProperty("query")) {
					this.socket = io.connect(connParams);
					this.log("Connected to local socket server with these parameters:",LOGLEVEL_INFO);
					this.log(connParams,LOGLEVEL_INFO);
					this.log("The generated socket object the client side is the following:",LOGLEVEL_INFO);
					this.log(this.socket,LOGLEVEL_INFO);
				}
				else {
					this.socket = io.connect();
					this.log("Connected to local socket server",LOGLEVEL_INFO);
				}
			}
			else {
				if(connParams.hasOwnProperty("path") || connParams.hasOwnProperty("query")) {
					this.socket = io.connect(this.serverEndpoint,connParams);
					this.log("Connected to socket server",LOGLEVEL_INFO);
				}
				else {
					this.socket = io.connect(this.serverEndpoint);
					this.log("Connected to socket server",LOGLEVEL_INFO);
				}				
			}
					
			this.socket.on("error",this.errorCallback);
			var siowObj = this; this.socket.on("keepAlive",function(){siowObj.socket.emit("iAmAlive","iAmAlive");});
			
		}
		catch(e) {
			this.log("Connection failed to socket server. Error message is \""+e.message+"\". SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
			return;
		}
	}

	constructor(config,errorCallback=function(){},startedCallback=function(){}) {
		
		// Config reading
		
		this.startable = false;
		
		this.ineedthese = [];
		
		if(config.hasOwnProperty("queryString")) {
			this.qryStr = config.queryString;
			this.parseQueryString();			
		}
		else {
			this.qryObj = {};
		}
		
		if(this.qryObj.hasOwnProperty("logLevel")) {
			config.logLevel = this.qryObj.logLevel;
		}
		if(config.hasOwnProperty("logLevel")) {			
			if(config.logLevel == LOGLEVEL_INFO || config.logLevel == LOGLEVEL_ERROR || config.logLevel == LOGLEVEL_OFF) {
				this.logLevel = config.logLevel;
				this.log("logLevel configuration parameter set to \""+this.logLevel+"\".", LOGLEVEL_INFO);
			}
			else {
				this.logLevel = LOGLEVEL_ERROR;
				this.log("Invalid value \""+config.logLevel+"\" for logLevel configuration parameter. Allowed values are: \""+LOGLEVEL_INFO+"\", \""+LOGLEVEL_ERROR+"\", or \""+LOGLEVEL_OFF+"\". Using: \""+LOGLEVEL_ERROR+"\".");
			}
		}
		else {
			this.logLevel = LOGLEVEL_ERROR;
			this.log("logLevel configuration parameter set to default value \""+LOGLEVEL_ERROR+"\".",LOGLEVEL_INFO);
		}
		
		if(this.qryObj.hasOwnProperty("id")) {
			config.id = this.qryObj.id;
		}
		if(config.hasOwnProperty("id")) {			
			this.instanceId = config.id;
			this.log("instanceId: \""+this.instanceId+"\".", LOGLEVEL_INFO);
		}
		else {
				this.log("You have not indicated which synoptic should be displayed. SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
				return;
		}
		
		if(this.qryObj.hasOwnProperty("serverEndpoint")) {
			config.serverEndpoint = this.qryObj.serverEndpoint;
		}
		if(config.hasOwnProperty("serverEndpoint")) {
			this.serverEndpoint = config.serverEndpoint;
			this.log("serverEndpoint configuration parameter set to \""+this.serverEndpoint+"\".", LOGLEVEL_INFO);
		}
		else {
			this.serverEndpoint = null;
			this.log("serverEndpoint configuration parameter not set, assuming same host of client on default port.", LOGLEVEL_INFO);
		}
		
		if(this.qryObj.hasOwnProperty("connPath")) {
			config.connPath = this.qryObj.connPath;
		}
		if(config.hasOwnProperty("connPath")) {
			this.connPath = config.connPath;
			this.log("connPath configuration parameter set to \""+this.connPath+"\".", LOGLEVEL_INFO);
		}
		else {
			this.connPath = null;
			this.log("connPath configuration parameter not set. Connection to socket server will be attempted without specifying any path.", LOGLEVEL_INFO);
		}
		
		if(this.qryObj.hasOwnProperty("connQuery")) {
			config.connQuery = this.qryObj.connQuery;
		}
		if(config.hasOwnProperty("connQuery")) {
			this.connQuery = config.connQuery;
			this.log("connQuery configuration parameter set to \""+this.connQuery+"\".", LOGLEVEL_INFO);
		}
		else {
			this.connQuery = null;
			this.log("connQuery configuration parameter not set. Connection to server will be attempted without submitting any query string.", LOGLEVEL_INFO);
		}
				
		if(this.qryObj.hasOwnProperty("attrName")) {
			config.attrName = this.qryObj.attrName;
		}
		if(config.hasOwnProperty("attrName")) {
			if(config.attrName.startsWith("data-")) {
				this.attrName = config.attrName;
				this.log("attrName configuration parameter set to \""+this.attrName+"\".", LOGLEVEL_INFO);
			}
			else {
				this.attrName = "data-siow";
				this.log("Invalid value \""+config.attrName+"\" for attrName configuration parameter. Allowed values start with \"data-\". Using: \"data-siow\"", LOGLEVEL_ERROR);
			}
		}
		else {
			this.attrName = "data-siow";
			this.log("attrName configuration parameter set to default value \"data-siow\".",LOGLEVEL_INFO);
		}
		
		if(this.qryObj.hasOwnProperty("container")) {
			config.container = this.qryObj.container;
		}
		if(config.hasOwnProperty("container")) {
			this.staticDestination = config.container;
			this.log("staticDestination configuration parameter set to \""+this.staticDestination+"\".", LOGLEVEL_INFO);
		}
		else {
			this.staticDestination = "body";
			this.log("staticDestination configuration parameter set to default value \"body\"",LOGLEVEL_INFO);
		}
	
		if(this.qryObj.hasOwnProperty("pathDataName")) {
			config.pathDataName = this.qryObj.pathDataName;
		}
		if(config.hasOwnProperty("pathDataName")) {
			this.pathDataName = config.pathDataName;
		}
		else {
			this.pathDataName = "path";
		}
		
		this.errorCallback = errorCallback;
		
		this.startedCallback = startedCallback;
		
		var siowObj = this;
		
		// Connection
		
		this.connect();
		
		// Start of interaction
		
		if(config["accessToken"]) { 
			this.socket.on("authenticate",function(authResp){
				var authResp = JSON.parse(authResp);
				if("OK" == authResp["status"]) {
					siowObj.socket.on("display",function(synopticResp){
						var synRespObj = JSON.parse(synopticResp);
						if(synRespObj["template"] && synRespObj["mappings"] && "OK" == synRespObj["status"]) {
							siowObj.staticSource = synRespObj["template"];
							siowObj.instances = {};
							siowObj.instances[siowObj.instanceId] = synRespObj["mappings"];
							siowObj.startable = true;		
							siowObj.start();
						}
						else {
							siowObj.log("Unable to get synoptic metadata. SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
							if(synRespObj["error"] == "unauthorized") { siowObj.errorCallback(); }
							return;							
						}
					});
					siowObj.socket.emit("display", siowObj.instanceId);			
				}
				else {
					siowObj.log("Unable to authenticate with the provided access token. SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
					return;
				}
			});
			this.socket.emit("setSrcReq", "synoptic");			
			this.socket.emit("setSrcId", this.instanceId);			
			this.socket.emit("authenticate", config["accessToken"]);			
		}
		else {
			this.socket.on("display",function(synopticResp){
				var synRespObj = JSON.parse(synopticResp);
				if(synRespObj["template"] && synRespObj["mappings"] && "OK" == synRespObj["status"]) {
					siowObj.staticSource = synRespObj["template"];
					siowObj.instances = {};
					siowObj.instances[siowObj.instanceId] = synRespObj["mappings"];
					siowObj.startable = true;		
					siowObj.start();
				}
				else {
					siowObj.log("Unable to get synoptic metadata. SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
					if(synRespObj["error"] == "unauthorized") { siowObj.errorCallback(); }
					return;							
				}
			});
			this.socket.emit("setSrcReq", "synoptic");			
			this.socket.emit("setSrcId", this.instanceId);			
			this.socket.emit("display", this.instanceId);			
		}

	}

	start() {		
		
		if(!this.startable) {
			this.log("Tried to start, but it is not startable yet. I will try again shortly.",LOGLEVEL_INFO);
			return;
		}
		
		this.log("Starting",LOGLEVEL_INFO);
		
		// CHECK PRECONDITIONS / FIX THE FIXABLE
		
		// load static contents
		
		if($(this.staticDestination).length === 0) {
			this.log("Selector \""+this.staticDestination+"\" selects nothing in this page. Double check the staticDestination configuration parameter. SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
			return;
		}
		
		var siowObj = this;
		
		$(this.staticDestination).load(this.staticSource,function(response,status,xhr){

			if(status == "error") {
				siowObj.log("Loading failed of static content from \""+siowObj.staticSource+"\". Error message is \""+xhr.status+" "+xhr.statusText+"\". Double check the staticSource configuration parameter. SIOW stops here. Nothing will work.", LOGLEVEL_ERROR);
				return;
			}
			
			siowObj.log("Static contents loaded.",LOGLEVEL_INFO);		

			// scroll data attributes in static contents
			
			siowObj.actions = [];		
			
			$("["+siowObj.attrName+"]").each(function() {			
				
				// parse attribute value
				
				var dataSiow = {};
				
				dataSiow.element = $(this);
				siowObj.log("Element found that is of interest for SIOW:",LOGLEVEL_INFO);
				siowObj.log(dataSiow.element,LOGLEVEL_INFO);
				
				try { 
					dataSiow.config = $(this).data(siowObj.attrName.substring(5)); 
					siowObj.log("Successfully parsed the following:",LOGLEVEL_INFO);
					siowObj.log(dataSiow.config,LOGLEVEL_INFO);
				} catch(e) { 
					siowObj.log("Unable to parse the following ("+e.message+", skipping to next element):",LOGLEVEL_ERROR); 
					siowObj.log($(this).data(siowObj.attrName.substring(5)),LOGLEVEL_ERROR); 
					return true;
				}
				
				var cleanedConfig = [];
				
				$.each(dataSiow.config, function(i, aSiow) {
					
					// validate event handler
					
					// var aSiow = $(this);
					
					if(!aSiow.hasOwnProperty("event")) {
						siowObj.log("Could not find mandatory event in the following handler definition (skipping to next):",LOGLEVEL_ERROR);
						siowObj.log(aSiow,LOGLEVEL_ERROR);
						return true;
						 
					}
					var event = aSiow.event;
					
					siowObj.log("event = "+event,LOGLEVEL_INFO);
					
					if(!aSiow.hasOwnProperty("originator")) {
						siowObj.log("Could not find mandatory originator in the following handler definition (skipping to next):",LOGLEVEL_ERROR);
						siowObj.log(aSiow,LOGLEVEL_ERROR);
						return true;
					}
					if(!(aSiow.originator == "server" || aSiow.originator == "client" )) {
						siowObj.log("Invalid value \""+aSiow.originator+"\" for originator in the following handler definition (allowed values are \"server\" or \"client\", skipping to next):",LOGLEVEL_ERROR);
						siowObj.log(aSiow,LOGLEVEL_ERROR);
						return true;
					}
					var originator = aSiow.originator;
					
					siowObj.log("originator = "+originator, LOGLEVEL_INFO);

					if(!aSiow.hasOwnProperty("actions")) {
						siowObj.log("Could not find mandatory actions in the following handler definition (skipping to next):", LOGLEVEL_ERROR);
						siowObj.log(aSiow,LOGLEVEL_ERROR);
						return true;
					}
					if(!Array.isArray(aSiow.actions)) {
						siowObj.log("Invalid actions in the following handler definition (array expected, skipping to next handler):", LOGLEVEL_ERROR);
						siowObj.log(aSiow,LOGLEVEL_ERROR);
						return true;
					}
					
					var cleanedActions = [];
					
					$.each(aSiow.actions, function(ii,aSiowAction) {
						
						// validate action 
						
						//var aSiowAction = $(this);
						siowObj.log("Parsing the following action:",LOGLEVEL_INFO);
						siowObj.log(aSiowAction,LOGLEVEL_INFO);
						
						if(!aSiowAction.hasOwnProperty("target")) {
							siowObj.log("Could not find mandatory target in the following handler action definition (skipping to next):",LOGLEVEL_ERROR);
							siowObj.log(aSiowAction,LOGLEVEL_ERROR);
							return true;
						}					
						var target = aSiowAction.target;

						siowObj.log("target = "+target,LOGLEVEL_INFO);

						/*if(!aSiowAction.hasOwnProperty("input")) {
							siowObj.log("Could not find mandatory input in the following handler action definition (skipping to next):",LOGLEVEL_ERROR);
							siowObj.log(aSiowAction,LOGLEVEL_ERROR);
							return true;
						}*/
						var input = aSiowAction.input;

						siowObj.log("input = "+input,LOGLEVEL_INFO);

						var normalize = null;
						if(aSiowAction.hasOwnProperty("normalize")) {
							var normArgs = aSiowAction.normalize.split(" ");
							var valid = true;
							if(normArgs.length != 4) {
								siowObj.log("Invalid normalize specification in the following handler action definition (expected four numbers separated by spaces, skipping normalization):",LOGLEVEL_ERROR);
								siowObj.log(aSiowAction,LOGLEVEL_ERROR);
								valid = false;
							}
							for(var i = 0; i < 4; i++) {
								if(isNaN(normArgs[i])) {
									var what = null;
									switch(i) {
										case 0:
											what = "minIn";
											break;
										case 1:
											what = "minOut";
											break;
										case 2:
											what = "maxIn";
											break;
										case 3:
											what = "maxOut";
											break;
									}
									siowObj.log("Invalid "+what+" \""+normArgs[i]+"\" in normalize specification in the following handler action definition (expected number, skipping normalization):",LOGLEVEL_ERROR);
									siowObj.log(aSiowAction,LOGLEVEL_ERROR);
									valid = false; 
								}
							}
							if(valid) {
								normalize = aSiowAction.normalize;
								siowObj.log("normalize = "+normalize,LOGLEVEL_INFO);
							}
						}

						var thresholds = null;
						if(aSiowAction.hasOwnProperty("thresholds")) {							
							var treshArgs = aSiowAction.thresholds.split(" ");
							var valid = true;
							if(treshArgs.length % 2 == 0) {
								siowObj.log("Invalid thresholds in the following handler action definition (expected an odd quantity of space-separated values, skipping discretization):",LOGLEVEL_ERROR);
								siowObj.log(aSiowAction,LOGLEVEL_ERROR);
								valid = false;
							} 
							for(var i = 3; i < treshArgs.length; i=i+2) {
								if((!isNaN(treshArgs[i-2])) && (!isNaN(treshArgs[i])) && Number(treshArgs[i-2]) >= Number(treshArgs[i])) {
									siowObj.log("Invalid thresholds in the following handler action definition (expected increasing limits, skipping discretization):",LOGLEVEL_ERROR);
									siowObj.log(aSiowAction,LOGLEVEL_ERROR);
									valid = false;								
								} 
							}
							if(valid) {
								thresholds = aSiowAction.thresholds;
								siowObj.log("thresholds = "+thresholds, LOGLEVEL_INFO);
							} 
						}

						var strformat = null;
						if(aSiowAction.hasOwnProperty("format")) {
							if(aSiowAction.format.includes("{0}")) {
								strformat = aSiowAction.format;
								siowObj.log("format = "+strformat,LOGLEVEL_INFO);
							}
							else {
								siowObj.log("Invalid format in the following handler action definition (placeholder {0} not found, skipping formatting):",LOGLEVEL_ERROR);
								siowObj.log(aSiowAction,LOGLEVEL_ERROR);
							}
						}
						
						var find = null;
						if(aSiowAction.hasOwnProperty("find")) {
							find = aSiowAction.find;
						}
						
						var cleanedAction = {};
						cleanedAction.element = dataSiow.element;
						cleanedAction.event = event;
						cleanedAction.originator = originator;
						cleanedAction.target = target;
						cleanedAction.input = input;
						cleanedAction.normalize = normalize;
						cleanedAction.thresholds = thresholds;
						cleanedAction.strFormat = strformat;
						cleanedAction.find = find;
						cleanedActions.push(cleanedAction);
							
					});
					
					aSiow.actions = cleanedActions;
					
					cleanedConfig.push(Object.assign({}, aSiow));
						
				});		
				
				dataSiow.config = cleanedConfig;

				$.each(dataSiow.config, function(c,dsc) { 
					siowObj.actions = siowObj.actions.concat(dsc.actions);
				});
						
			});
			
			// PERFORM ACTIONS
			$.each(siowObj.actions,function(iii,action){
				//var action = $(this);
				siowObj.log("Arranging to perform the following action:",LOGLEVEL_INFO);
				siowObj.log(action,LOGLEVEL_INFO);
				if(action.originator == "client") { // writing to server
										
					try { 
						var ineedthis = action.target.split(" ")[0];
						if(siowObj.instances[siowObj.instanceId]["output"][action.target.split(" ")[0]]) {
							ineedthis = siowObj.instances[siowObj.instanceId]["output"][action.target.split(" ")[0]]; 
						}
						if(ineedthis != "write") {
							// siowObj.ineedthese.push(ineedthis);
							siowObj.socket.emit("subscribe", ineedthis);	
						}
					} catch(i) {}			
					
					if(action.event == "click") action.element.css("cursor","pointer");					
					action.element.on( action.event, function() {
						siowObj.log("Fired client-side event "+action.event+" on this element:",LOGLEVEL_INFO);
						siowObj.log(action.element,LOGLEVEL_INFO);
						try {
							if(!action.input) action.input = "attribute value";
							var value = null;
							if(action.input.split(" ")[0] == "element" && action.input.split(" ")[1] == "textContent") {
								value = action.element[0].textContent.trim();
							}
							else if(action.input.split(" ")[0] == "attribute") {
								value = action.element.attr(action.input.split(" ")[1]);
							}							
							else if(action.input.split(" ")[0] == "style"){
								value = action.element.css(action.input.split(" ")[1]);
							}							
							if(action.input.split(" ").length == 3) {
								value = jsonPath(JSON.parse(value),action.input.split(" ")[2]);
								if(value.length == 1) value = value[0];
								if(typeof value === "object" ) value = JSON.stringify(value);
							}
							siowObj.log("Raw data that is going to be sent to the socket server:",LOGLEVEL_INFO); 
							siowObj.log(value,LOGLEVEL_INFO); 
							if(action.normalize != null) {
								var nArgs = action.normalize.split(" ");
								var offset = ((Number(value)-Number(nArgs[0]))/(Number(nArgs[2])-Number(nArgs[0])))*(Number(nArgs[3])-Number(nArgs[1]));
								value = (offset>=0?Number(nArgs[1]):Number(nArgs[3]))+offset;
								if(Number(value) < Number(nArgs[1])) value = Number(nArgs[1]);
								if(Number(value) > Number(nArgs[3])) value = Number(nArgs[3]);
							}
							siowObj.log("Normalized data that is going to be sent to the socket server:",LOGLEVEL_INFO); 
							siowObj.log(value,LOGLEVEL_INFO); 
							if(action.thresholds != null) {
								var tArgs = action.thresholds.split(" ");
								var newValue = tArgs[0];
								var li = 1;
								if(isNaN(value)) {
									while(li < tArgs.length) {
										if(tArgs[li] == value) {
											value = tArgs[li+1];
											break;
										}
										li = li + 2;
									}
								}
								else {
									while(Number(value) >= Number(tArgs[li])) {
										newValue = tArgs[li+1]; 
										li = li + 2;
									}
								}
								value = newValue;
							}
							siowObj.log("Discretized data that is going to be sent to the socket server:",LOGLEVEL_INFO); 
							siowObj.log(value,LOGLEVEL_INFO); 							
							if(action.target.split(" ").length > 1 && action.target.split(" ")[1] == "dialog") {
								value = prompt("New value:",value);
								siowObj.log("Raw data that is going to be sent to the socket server:",LOGLEVEL_INFO); 
								siowObj.log(value,LOGLEVEL_INFO); 
								if(action.normalize != null) {
									var nArgs = action.normalize.split(" ");
									var offset = ((Number(value)-Number(nArgs[0]))/(Number(nArgs[2])-Number(nArgs[0])))*(Number(nArgs[3])-Number(nArgs[1]));
									value = (offset>=0?Number(nArgs[1]):Number(nArgs[3]))+offset;
									if(Number(value) < Number(nArgs[1])) value = Number(nArgs[1]);
									if(Number(value) > Number(nArgs[3])) value = Number(nArgs[3]);									
								}
								siowObj.log("Normalized data that is going to be sent to the socket server:",LOGLEVEL_INFO); 
								siowObj.log(value,LOGLEVEL_INFO); 
								if(action.thresholds != null) {
									var tArgs = action.thresholds.split(" ");
									var newValue = tArgs[0];
									var li = 1;
									if(isNaN(value)) {
										while(li < tArgs.length) {
											if(tArgs[li] == value) {
												value = tArgs[li+1];
												break;
											}
											li = li + 2;
										}
									}
									else {
										while(Number(value) >= Number(tArgs[li])) {
											newValue = tArgs[li+1]; 
											li = li + 2;
										}
									}
									value = newValue;
								}
								siowObj.log("Discretized data that is going to be sent to the socket server:",LOGLEVEL_INFO); 
								siowObj.log(value,LOGLEVEL_INFO); 							
								if(action.strFormat) value = action.strFormat.replace("{0}",value);
								value = siowObj.legacy(siowObj,value);
								
								var eventName = action.target.split(" ")[0];
								try { 
									if(siowObj.instances[siowObj.instanceId]["output"][action.target.split(" ")[0]]) {
										eventName = siowObj.instances[siowObj.instanceId]["output"][action.target.split(" ")[0]]; 
									}
									else {
										siowObj.log("No mapping found for output variable "+action.target.split(" ")[0]+". Using name written in the synoptic template.",LOGLEVEL_INFO); 
									}
								} catch(i) { 
									siowObj.log("No mapping found for output variable "+action.target.split(" ")[0]+". Using name written in the synoptic template.",LOGLEVEL_INFO); 
								}					
								siowObj.log("The socket to which the client is going to emit the event is the following:",LOGLEVEL_INFO); siowObj.log(siowObj.socket,LOGLEVEL_INFO);
								siowObj.socket.emit(eventName,value,function(ackData){
									siowObj.log("Callback data after the emission of the event is the following:",LOGLEVEL_INFO);
									siowObj.log(ackData,LOGLEVEL_INFO);
								});
								
							}
							else {
								
								if(action.strFormat) value = action.strFormat.replace("{0}",value);
								value = siowObj.legacy(siowObj,value);
								
								var eventName = action.target.split(" ")[0];
								try { 
									if(siowObj.instances[siowObj.instanceId]["output"][action.target.split(" ")[0]]) {
										eventName = siowObj.instances[siowObj.instanceId]["output"][action.target.split(" ")[0]]; 
									}
									else {
										siowObj.log("No mapping found for output variable "+action.target.split(" ")[0]+". Using name written in the synoptic template.",LOGLEVEL_INFO); 
									}
								} catch(i) { 
									siowObj.log("No mapping found for output variable "+action.target.split(" ")[0]+". Using name written in the synoptic template.",LOGLEVEL_INFO); 
								}
								
								//siowObj.socket.emit(eventName,value);
								siowObj.log("The socket to which the client is going to emit the event is the following:",LOGLEVEL_INFO); siowObj.log(siowObj.socket,LOGLEVEL_INFO);
								siowObj.socket.emit(eventName,value,function(ackData){
									siowObj.log("Callback data after the emission of the event is the following:",LOGLEVEL_INFO);
									siowObj.log(ackData,LOGLEVEL_INFO);
								});
							}
							siowObj.log("Client emitted event to server, event name was \""+eventName+"\", event data were:",LOGLEVEL_INFO);
							siowObj.log(value,LOGLEVEL_INFO);
						}
						catch(e) {
							siowObj.log("An error occurred (\""+e.message+"\") while handling the client-side event \""+action.event+"\" on this element:",LOGLEVEL_ERROR);
							siowObj.log(action.element,LOGLEVEL_ERROR);
						}
					});
					siowObj.log("Registered client-side event \""+action.event+"\" on the following element:",LOGLEVEL_INFO);
					siowObj.log(action.element,LOGLEVEL_INFO);
				}
				else { // reading from server
					var actualEvent = action.event;
					try { 
						if(siowObj.instances[siowObj.instanceId]["input"][action.event]) {
							actualEvent = siowObj.instances[siowObj.instanceId]["input"][action.event]; 
						}
						else {
							siowObj.log("No mapping found for input variable "+action.event+". Using name written in the synoptic template.",LOGLEVEL_INFO); 
						}
					} catch(i) { 
						siowObj.log("No mapping found for input variable "+action.event+". Using name written in the synoptic template.",LOGLEVEL_INFO); 
					}
					if(actualEvent != "write") {
						// siowObj.ineedthese.push(actualEvent);
						siowObj.socket.emit("subscribe", actualEvent);
					}
					siowObj.socket.on("update "+actualEvent, function(data){
						try {
							
							siowObj.log("Client is going to handle an event originated by the server, event name is \""+action.event+"\", destination is \""+action.target+"\", received data are \""+data+"\", and the interested element is the following:",LOGLEVEL_INFO);
							siowObj.log(action.element,LOGLEVEL_INFO);
								
							var value = data;
							if(action.input) {
								value = jsonPath(JSON.parse(value),action.input);
								if(value.length == 1) value = value[0];
								if(typeof value === "object" ) value = JSON.stringify(value);
							}
							siowObj.log("Raw data that is going to be used for updating the synoptic:",LOGLEVEL_INFO);
							siowObj.log(value,LOGLEVEL_INFO);
							if(action.normalize != null) {								
								var nArgs = action.normalize.split(" ");
								var min13 = Math.min(Number(nArgs[1]),Number(nArgs[3]));								

								if(min13 < 0) {
									nArgs[1] = Number(nArgs[1]) - min13;
									nArgs[3] = Number(nArgs[3]) - min13;
								}								
								var offset = ((Number(value)-Number(nArgs[0]))/(Number(nArgs[2])-Number(nArgs[0])))*(Number(nArgs[3])-Number(nArgs[1]));					
								value = (offset>=0?Math.min(Number(nArgs[1]),Number(nArgs[3])):Math.max(Number(nArgs[3]),Number(nArgs[1])))+offset;

								if(min13 < 0) {
									value+=min13;
									nArgs[1]+=min13;
									nArgs[3]+=min13;
								}

								if(Number(value) < Math.min(Number(nArgs[1]),Number(nArgs[3]))) value = Math.min(Number(nArgs[1]),Number(nArgs[3]))
								if(Number(value) > Math.max(Number(nArgs[3]),Number(nArgs[1]))) value = Math.max(Number(nArgs[3]),Number(nArgs[1]))

							}
							siowObj.log("Normalized data that is going to be used for updating the synoptic:",LOGLEVEL_INFO);
							siowObj.log(value,LOGLEVEL_INFO);
							if(action.thresholds != null) {
								var tArgs = action.thresholds.split(" ");
								var newValue = tArgs[0];
								var li = 1;
								if(isNaN(value)) {
									while(li < tArgs.length) {
										if(tArgs[li] == value) {											
											newValue = tArgs[li+1];
											break;
										}
										li = li + 2;
									}
								}
								else {
									while(Number(value) >= Number(tArgs[li])) {																				
										newValue = tArgs[li+1]; 
										li = li + 2;
									}
								}
								value = newValue;
							}
							siowObj.log("Discretized data that is going to be used for updating the synoptic:",LOGLEVEL_INFO);
							siowObj.log(value,LOGLEVEL_INFO);
							
							if(action.find) {
								var doPrefix = false;
								var isSelectorValid = true;
								if($(value).length == 1) { doPrefix = false; }
								else if($("#"+value).length == 1) {  doPrefix = true; }
								else { isSelectorValid = false; }
								if(isSelectorValid && action.find.split(" ")[0] == "attribute") {	
									siowObj.log("Value of "+action.find+" of "+value+": ",LOGLEVEL_INFO);
									if(!doPrefix) value = $(value).first().attr(action.find.split(" ")[1]);			
									else value = $("#"+value).first().attr(action.find.split(" ")[1]);
									siowObj.log(value,LOGLEVEL_INFO);										
								}
								else if(isSelectorValid && action.find.split(" ")[0] == "style"){
									siowObj.log("Value of "+action.find+" of "+value+": ",LOGLEVEL_INFO);
									if(!doPrefix) value = $(value).first().css(action.find.split(" ")[1]);
									else value = $("#"+value).first().css(action.find.split(" ")[1]);
									siowObj.log(value,LOGLEVEL_INFO);		
								}
								else {
									siowObj.log("Client handled event from server, event name was \""+action.event+"\", the FIND selector or argument was not valid, the FIND was ignored",LOGLEVEL_ERROR);
								}								
							}
							
							if(action.strFormat) value = action.strFormat.replace("{0}",value);
							
							if(!action.target) action.target = "textContent";
							if(action.target == "textContent") {
								action.element[0].textContent = value;
								siowObj.log("Client handled event from server, event name was \""+action.event+"\", destination was \""+action.target+"\", received value was \""+value+"\", and the interested element has been the following:",LOGLEVEL_INFO);
								siowObj.log(action.element,LOGLEVEL_INFO);
							}
							else if(action.target.split(" ")[0] == "attribute") {
								action.element.attr(action.target.split(" ")[1],value);
								siowObj.log("Client handled event from server, event name was \""+action.event+"\", destination was \""+action.target+"\", received value was \""+value+"\", and the interested element has been the following:",LOGLEVEL_INFO);
								siowObj.log(action.element,LOGLEVEL_INFO);
							}							
							else if(action.target.split(" ")[0] == "style"){
								if(action.target.split(" ")[1] == "offset-distance") {
									if(action.element.data(siowObj.pathDataName)) {
										var path = null;									
										if(action.element.data(siowObj.pathDataName).startsWith("#")) {
											path = $(action.element.data(siowObj.pathDataName)).attr("d");
										}
										else {
											path = action.element.data(siowObj.pathDataName);
										}
										action.element.css("motion-path","path('"+path+"')");
										action.element.css("offset-path","path('"+path+"')");
									}
								}
								action.element.css(action.target.split(" ")[1],value);
								siowObj.log("Client handled event from server, event name was \""+action.event+"\", destination was \""+action.target+"\", received value was \""+value+"\", and the interested element has been the following:",LOGLEVEL_INFO);
								siowObj.log(action.element,LOGLEVEL_INFO);								
							}
							else {
								siowObj.log("Client handled event from server, event name was \""+action.event+"\", DESTINATION WAS NOT VALID AND THEREFORE NOTHING WAS DONE, received value was \""+value+"\", and the interested element has been the following:",LOGLEVEL_ERROR);
								siowObj.log(action.element,LOGLEVEL_ERROR);
							}

						}
						catch(e) {
							siowObj.log("An error occurred (\""+e.message+"\") while handling the server-side event \""+action.event+"\" on this element:",LOGLEVEL_ERROR);
							siowObj.log(action.element,LOGLEVEL_ERROR);
						}
						
						$(document).trigger('SIOWSE');
						
					});
				};
			});
			
			siowObj.log("Started.",LOGLEVEL_INFO);
			
			// if(siowObj.ineedthese.length > 0 && siowObj.instances) siowObj.socket.emit("i_need_these",siowObj.ineedthese.join());
			
			siowObj.startedCallback();
			
		});
	}
	
	stop() {
		try {
			this.socket.disconnect();
			$.each(this.actions, function(i,action){
				//var action = $(this);
				if(action.originator == "client") {
					action.element.off(action.event);
					if(action.event == "click") action.element.css("cursor","default");
				}
			});
			this.log("Stopped.",LOGLEVEL_INFO);
		}
		catch(e) {
			this.log("An error occurred (\""+e.message+"\") while stoppping SIOW.",LOGLEVEL_ERROR);
		}
	}
	
	setToken(newToken) {
		this.socket.emit("authenticate",newToken);
	}

}

