mergeInto(LibraryManager.library, {

  SetUnityData: function (inputArray, inputSize, outputArray, outputSize, width, height) {
    var VonageUnity = {
        input: {
            array: inputArray,
            size: inputSize
        },
        output: {
            array: outputArray,
            size: outputSize
        },
        size: {
          width: width,
          height: height
        }
    }
    this.VonageUnity = VonageUnity
  },
});