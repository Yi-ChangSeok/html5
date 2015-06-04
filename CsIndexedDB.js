// Last time updated : Fri May 22 2015 14:50:25 GMT+0900

/**
 * CsIndexedDB v0.1b
 * Copyright 2015 YCS OpenSource.
 * Licensed under MIT (https://github.com/Yi-ChangSeok/html5.CsIndexedDB/blob/master/LICENSE)
 */
+function(){
	'use strict';

	var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;
	var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
	var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

	if(!indexedDB){
		console.error("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
		return;
	}

	/**
	 * @options {
	 *  onsuccess: function(e){},
	 *  onerror: function(e){},
	 *  onversionchange: function(e){},
	 *  storeList: [
	 *    {
	 *      name: "storeName",
	 *      options: {keyPath: "userId" //, autoIncrement: true},
	 *      indexList: [{name: "userId", col: "userId", options: {unique: true, multiEntry: false}}],
	 *      dataList: [{userId: 1, name: "hong", age: 30}]
	 *    }
	 *  ],
	 * }
	 */
	var CsIndexedDB = function(dbName, dbVersion, options){
		var THIS = this;
		
		if(!options){
			if(dbVersion instanceof Object){
				options = dbVersion;
				dbVersion = null;
			}
		}

		const OPTS = merge({}, options);

		var req;
		var db;
		var stores;
		
		open();

		function open(){
			console.debug("# CsIndexedDB open start : name["+dbName+"]", "version["+(dbVersion||"lastest")+"]");
			if(dbVersion=="lastest"){
				dbVersion = null;
			}
			req = (dbVersion ? indexedDB.open(dbName, dbVersion) : indexedDB.open(dbName));

			req.onerror = function(event){
				console.error("# CsIndexedDB open fail :", event);
				if(OPTS.onerror){
					OPTS.onerror.call(this, event);
				}
			}

			req.onblocked = function(event){
				console.warn("onblocked :", event);
				// TODO
				//alert("이 페이지 정보가 업데이트 됩니다. 다른 탭의 관련 페이지를 닫아 주시기 바랍니다.");
			}

			req.onsuccess = function(event){
				db = req.result;
				db.onerror = function(event){
					console.error("db error :", event);
				}
				db.onclose = function(event){
					console.debug("db close :", event);
				}
				db.onversionchange = function(event){
					console.warn("onversionchange :", event);
					THIS.close();
					//alert(" 이 페이지의 정보가 업데이트 되었습니다. 재접속하거나 새로고침을 해주시기 바랍니다. ");
					
					open();
					
					if(OPTS.onversionchange){
						OPTS.onversionchange.call(THIS, event);
					}
				}
				console.debug("# CsIndexedDB opened : name["+db.name+"]", "version["+db.version+"]", "storeLen["+db.objectStoreNames.length+"]", db);

				// storeList set
				stores = new Map();
				for(var i=0, len=db.objectStoreNames.length; i<len; i++){
					var name = db.objectStoreNames.item(i);
					if(stores.has(name)==false){
						var s = new CsObjectStore(THIS, null, name);
						stores.set(name, s);
					}
				}

				if(OPTS.onsuccess){
					OPTS.onsuccess.call(THIS);
				}
			};

			req.onupgradeneeded = function(event){
				/*
				bubbles: false, cancelBubble: false, cancelable: false, currentTarget: null
				dataLoss: "none", dataLossMessage: "", defaultPrevented: false, eventPhase: 0
				newVersion: 1, oldVersion: 0, path: Array[0], returnValue: true
				srcElement: IDBOpenDBRequest, target: IDBOpenDBRequest, timeStamp: 1432096390282, type: "upgradeneeded"
				 */
				console.debug("# CsIndexedDB onupgradeneeded :", event);
				db = event.target.result;

				var createStore = function(store){
					console.debug("# CsIndexedDB createStore :", store.name);
					var s = new CsObjectStore(THIS, db, store.name, store.options, store.indexList, store.dataList);
					//stores.set(store.name, s);
				}

				if(event.oldVersion == 0){
					// init
					console.debug("# CsIndexedDB init stores");

					OPTS.storeList.forEach(function(store, i){
						createStore(store);
					});
				}else{
					// TODO
					console.debug("# CsIndexedDB update stores");

					if(OPTS.storeList && OPTS.storeList.length>0){
						var storeNameSet = new Set();
						for(var i=0, len=db.objectStoreNames.length; i<len; i++){
							var name = db.objectStoreNames.item(i);
							storeNameSet.add(name);
						}
						
						OPTS.storeList.forEach(function(store, i){
							if(storeNameSet.has(store.name)){
								//var s = new CsObjectStore(THIS, null, store.name);
								//stores.set(store.name, s);
							}else{
								createStore(store);
							}
						});
					}
				}
			}
		}

		// getter
		this.getDbName = function(){
			return (db && db.name) || DB_NAME;
		}
		this.getDbVersion = function(){
			return (db && db.version) || DB_VERSION;
		}
		this.getOptions = function(){
			return OPTS;
		}

		this.getDb = function(){
			return db;
		}
		this.getObjectStore = function(storeName){
			return stores.get(storeName);
		}
	};

	CsIndexedDB.prototype.close = function(){
		this.getDb().close();
		return this;
	}
	CsIndexedDB.prototype.deleteDB = function(){
		indexedDB.deleteDatabase(this.getDbName());
		return this;
	}

	var CsObjectStore = function(csDb, db, storeName, options, indexList, dataList){
		this.current = {
			transaction: null,
			store: null,
		}

		this.getStoreName = function(){
			return storeName;
		}
		this.getCsDb = function(){
			return csDb;
		}
		this.getDb = function(){
			return csDb.getDb();
		}

		// TODO
		if(!db){
			return;
		}

		var objectStore = db.createObjectStore(storeName, options);

		if(indexList){
			indexList.forEach(function(index, i){
				objectStore.createIndex(index.name, index.col, index.options);
			})
		}

		if(dataList){
			dataList.forEach(function(data, i){
				objectStore.put(data);
			})
		}
	};

	CsObjectStore.prototype.getTxObjectStore = function(mode){
		var THIS = this;
		
//		if(THIS.isStartTransaction()){
//			return THIS.startTransaction();
//		}else{
//			// mode:readonly(default), readwrite, versionchange
//			var tx = THIS.getDb().transaction([THIS.getStoreName()], mode);
//			var store = tx.objectStore(THIS.getStoreName());
//			return store;
//		}
		return THIS.startTransaction(mode);
	}
	
	CsObjectStore.prototype.isStartTransaction = function(){
		return this.current.store != null;
	}
	
	CsObjectStore.prototype.startTransaction = function(mode, oncomplete, onerror){
		var THIS = this;
		
		var store	= THIS.current.store;
		var tx		= THIS.current.transaction;
		
		if(store){
			return store;
		}
		
		// mode:readonly(default), readwrite, versionchange
		tx = THIS.current.transaction = THIS.getDb().transaction([THIS.getStoreName()], mode||"readonly");
		store = THIS.current.store = tx.objectStore(THIS.getStoreName());
		
		tx.addEventListener("complete", function(event){
			THIS.endTransaction();
			if(oncomplete){
				oncomplete.call(THIS, event);
			}
		});
		tx.addEventListener("abort", function(event){
			//console.warn("tx abort :", event);
			THIS.endTransaction();
			if(onerror){
				var error = tx.error || {};
				onerror.call(THIS, event, error.name, error.message);
			}else{
				var msg = "";
				if(tx.error){
					msg = "["+tx.error.name+"] "+tx.error.message;
				}
				console.error("tx abort :", msg, "\r\n", event);
			}
		});
		tx.addEventListener("error", function(event){
			THIS.endTransaction();
			//tx.abort();
		});
		
		return store;
	}
	
	CsObjectStore.prototype.abortTransaction = function(){
		var THIS = this;
		
		var tx = THIS.current.transaction;
		tx.abort();
		
		return THIS;
	}
	
	CsObjectStore.prototype.endTransaction = function(){
		var THIS = this;
		
		THIS.current.store = null;
		THIS.current.transaction = null;
		
		return THIS;
	}
	
	CsObjectStore.prototype.runTransaction = function(run, oncomplete, onerror){
		var THIS = this;
		
		THIS.startTransaction("readwrite", oncomplete, onerror);
		run.call(THIS);
		THIS.endTransaction();
		
		return THIS;
	}

	CsObjectStore.prototype.makeKeyRange = function(options){
		options = merge({
			only: null, // value
			lower: null, // true
			excludeLower: null, // true, false
			upper: null,
			excludeUpper: null, // true, false
		}, options);
		
		var only = options.only != undefined;
		var lower = options.lower != undefined;
		var upper = options.upper != undefined;

		var kr = null;
		if(only){
			kr = IDBKeyRange.only(options.only);
		}else if(lower && upper){
			kr = IDBKeyRange.bound(options.lower, options.upper, options.excludeLower, options.excludeUpper);
		}else if(lower){
			kr = IDBKeyRange.lowerBound(options.lower, options.excludeLower);
		}else if(upper){
			kr = IDBKeyRange.upperBound(options.upper, options.excludeUpper);
		}
		return kr;
	};
	
	CsObjectStore.prototype.find = function(options, onitem, oncomplete, onerror){
		var THIS = this;
		var store = THIS.getTxObjectStore();
		
		try{
			options = merge({
				index: null,
				direction: "next", // 'next', 'nextunique', 'prev', or 'prevunique'
			}, options);
			
			var keyRange;
			if(options.index){
				store = store.index(options.index);
			}
			keyRange = THIS.makeKeyRange(options);
			//keyRange = THIS.makeKeyRange({lower:3, excludeUpper:false});
 
			var req = store.openCursor(keyRange, options.direction || "next");
			
			var list;
			if(oncomplete){
				list = [];
			}
			
			var cnt = 0;
			req.onsuccess = function(event){
				var cursor = event.target.result;
				if(cursor){
					var data = cursor.value;
					
					var rt;
					if(onitem){
						rt = onitem.call(THIS, data, cnt);
						cnt++;
					}
					if(oncomplete){
						list.push(data);
					}
					
					if(rt !== false){
						cursor["continue"]();
					}
				}else{
					// end cursor
					if(onitem){
						onitem.call(THIS, null);
					}
					if(oncomplete){
						oncomplete.call(THIS, list);
					}
				}
			}
			req.onerror = function(event){
				if(onerror)
					onerror.call(THIS, event);
				else
					console.error("find error :", event);
			}
		}catch(e){
			if(onerror)
				onerror(e);
			else
				throw e;
		}
		
		return THIS;
	};
	
	CsObjectStore.prototype.findAll = function(oncomplete){
		var THIS = this;
		THIS.find(null, null, oncomplete, null);
		
		return THIS;
	};

	CsObjectStore.prototype.findByKey = function(key, onsuccess, onerror){
		var THIS = this;
		var store = THIS.getTxObjectStore();

		try{
			var req = store.get(key);

			req.onsuccess = function(event){
				onsuccess.call(THIS, req.result);
			}
			req.onerror = function(event){
				if(onerror)
					onerror.call(THIS, event);
				else
					console.error("findOne error :", event);
			}
		}catch(e){
			if(onerror)
				onerror(e);
			else
				throw e;
		}
		
		return THIS;
	}

	CsObjectStore.prototype.add = function(data, oncomplete, onerror){
		var THIS = this;

		if(!data){
			return this;
		}

		var store = THIS.getTxObjectStore("readwrite");
		if(data instanceof Array){
			data.forEach(function(obj, i){
				store.add(obj);
			});
		}else{
			store.add(data);
		}

		var tx = store.transaction;
		tx.addEventListener("complete", function(event){
			if(oncomplete){
				oncomplete.call(THIS, event, data);
			}
		})
		tx.addEventListener("abort", function(event){
			if(onerror){
				onerror.call(THIS, event);
			}else{
				var msg = "";
				if(tx.error){
					msg = "["+tx.error.name+"] "+tx.error.message;
				}
				console.error("add error :", msg, "\r\n", event);
			}
		});

		return THIS;
	};
	
	CsObjectStore.prototype.upsert = function(data, oncomplete, onerror){
		var THIS = this;
		
		if(!data){
			return this;
		}
		
		var store = THIS.getTxObjectStore("readwrite");
		if(data instanceof Array){
			data.forEach(function(obj, i){
				store.put(obj);
			});
		}else{
			store.put(data);
		}
		
		var tx = store.transaction;
		tx.addEventListener("complete", function(event){
			if(oncomplete){
				oncomplete.call(THIS, event, data);
			}
		})
		tx.addEventListener("abort", function(event){
			if(onerror){
				onerror.call(THIS, event);
			}else{
				var msg = "";
				if(tx.error){
					msg = "["+tx.error.name+"] "+tx.error.message;
				}
				console.error("upsert error :", msg, "\r\n", event);
			}
		});
		
		return THIS;
	};
	
	CsObjectStore.prototype.remove = function(key, onsuccess, onerror){
		var THIS = this;
		var store = THIS.getTxObjectStore("readwrite");

		try{
			if(typeof(key)=="object"){
				if(store.keyPath && typeof(store.keyPath)=="string"){
					var k = key[store.keyPath];
					if(k){
						key = k;
					}
				}
			}
			
			var req = store["delete"](key);

			req.onsuccess = function(event){
				if(onsuccess)
					onsuccess.call(THIS, event);
			}
			req.onerror = function(event){
				if(onerror)
					onerror.call(THIS, event);
				else
					console.error("remove error :", event);
			}
		}catch(e){
			if(onerror)
				onerror(e);
			else
				throw e;
		}
	};
	
	CsObjectStore.prototype.clear = function(onsuccess, onerror){
		var THIS = this;
		var store = THIS.getTxObjectStore("readwrite");
		
		var req = store.clear();

		req.onsuccess = function(event){
			if(onsuccess)
				onsuccess.call(THIS, event);
			else
				console.debug("clear all data :", store.name);
		}
		req.onerror = function(event){
			if(onerror)
				onerror.call(THIS, event);
			else
				console.error("clear error :", event);
		}
	};

	function parseValue(value, numberTypePlus){
		if(value instanceof Array){
			var list = [];
			value.forEach(function(v, i){
				list.push( parseValue(v) );
			});
			return list;
		}else if(value instanceof Function){
			return value;
		}else if(value instanceof Object){
			var obj = {};
			for(var k in value){
				obj[k] = parseValue(value[k]);
			}
			return obj;
		}else{

		}
		return value;
	}
	function merge(target, src, numberTypePlus){
		if(!target)
			return;
		if(!src)
			return target;

		for(var k in src){
			var value = parseValue(src[k]);
			if(numberTypePlus){
				// TODO
				if(typeof(target[k])=="number" || typeof(value)=="number"){
					//console.error("## key:"+k+", "+target[k]+"+"+value);
					value = (target[k] || 0) + (value || 0);
				}
			}
			target[k] = value;
		}
		return target;
	}
	
	////////////////////////////////////////////////////////////////////////////////////////////////

	var old = window.CsIndexedDB;

	window.CsIndexedDB = CsIndexedDB;

	CsIndexedDB.noConflict = function(){
		window.CsIndexedDB = old;
		return this;
	}
}();