
## Browser Support
CsIndexedDB works on all browsers supporting the [IndexedDB API](http://www.w3.org/TR/IndexedDB "W3 IndexedDB"), which are:


**Desktop**
* Chrome
* Firefox
* Opera 15+
* IE 10+

**Mobile**
* Chrome for Android
* Firefox for Android
* Opera for Android
* IE10 for WP8
* iOS 8+

## Usage

Including the CsIndexedDB.js file will add an CsIndexedDB constructor to the global scope.

## Create

**Create DB**
```javascript
var csdb = new CsIndexedDB(
		"test", // db name
		null, // dbVersion : null or Number
		{
			onsuccess: function(){
				console.debug("success");
				reloadUserList();
			},
			onerror: function(){
				console.debug("error");
			},
			onversionchange: function(event){
				// db update
			},
			// init create or version change
			storeList: [
				{
					name: "testOs",
					options: {keyPath: "userId", autoIncrement: false},
					indexList: [
						{name: "name", col: "name", options: {unique: false}}
					],
					dataList: [
						{userId: 1, name: "hong", age: 30},
						{userId: 2, name: "kim", age: 20},
						{userId: 3, name: "lee", age: 17},
					]
				}
			]
		}
	);
```

**Get CsObjectStore**
```javascript
var store = csdb.getObjectStore("testOs");
```

## CRUD


**Add**
```javascript
store.add(
		{userId: 30, name: "alice", age: 25},
		function(event, data){
			// success
			console.debug( "success" );
		},
		function(event){
			// error
			console.error( event );
		}
	);
```

**Find**
```javascript
store.find(
	// optional
	{
		index: "name",
		only: "kim",
		direction: "next", // next(default), nextunique, prev, prevunique
		lower: null, // gt
		excludeLower: false, // true:gt, false:gte
		upper: null, // lt
		excludeUpper: false // true:lt, false:lte
	},
	function(data, idx){
		// item : null data is end.
	},
	function(list){
		// complete
		console.debug( JSON.stringify(list, null, ' ') );
	}
);
```

**Find all**
```javascript
store.findAll(function(list){
	console.debug( JSON.stringify(list, null, ' ') );
});
```

**Find by key**
```javascript
store.findByKey(
	1,
	function(data){
		console.debug( JSON.stringify(data, null, ' ') );
	}
);
```

**Upsert**
```javascript
store.upsert(
		{userId: 30, name: "brown", age: 37},
		function(event){
			// success
			console.debug( "success" );
		},
		function(event){
			// error
			console.error( event );
		}
	);
```

**Remove**
```javascript
store.remove(
		{userId: 30, name: "brown", age: 37}, // or 30
		function(event){
			// success
			console.debug( "success" );
		},
		function(event){
			// error
			console.error( event );
		}
	);
```

**Remove all**
```javascript
store.clear(
		function(event){
			// success
			console.debug( "success" );
		},
		function(event){
			// error
			console.error( event );
		}
	);
```

## Transaction
기본적으로 한 Scope 에서는 트랙젝션을 보장한다.

**One transaction**
```javascript
[
	{userId: 10, name: "ycs", age: 30},
	{userId: 11, name: "pkj", age: 20},
	{userId: 12, name: "park", age: 17},
].forEach(function(data){
	store.add(data);
});
```

**Abort(Rollback) transaction**
```javascript
function error(){
	throw e;
}

try{
	store.add({userId: 20, name: "test", age: 55});
	error();
}catch(e){
	store.abortTransaction();
}

```