var LibraryMyPlugin = {
   MyData: {
       myVar: 123,
   },
 
   Setvar: function (val) {
       MyData.myVar = val;
        console.log('adding new calue', this, globalThis)
   },
   Getvar: function () {
        console.log('getting new calue', this, globalThis)
       return MyData.myVar;
   },
};
 
autoAddDeps(LibraryMyPlugin, 'MyData');
mergeInto(LibraryManager.library, LibraryMyPlugin);