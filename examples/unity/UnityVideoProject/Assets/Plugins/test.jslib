mergeInto(LibraryManager.library, {

  SetArrays: function (inputArray, inputSize, outputArray, outputSize) {
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
  },
});