mergeInto(LibraryManager.library, {

  SetArrays: function (inputArray, inputSize, outputArray, outputSize) {
    console.log(' before', this, globalThis)
    var VonageUnity = {
        input: {
            array: inputArray,
            size: inputSize
        },
        output: {
            array: outputArray,
            size: outputSize
        } 
    }
    this.VonageUnity = VonageUnity
    console.log(' after', this, globalThis)
  },
  TestFun: function()
  {
    console.log('second function', this, globalThis)
  }

});