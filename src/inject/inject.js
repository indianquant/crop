const frameWidth  = 800;
const frameHeight = 600;

const fileInputs  = [
  {
    file:   'input[type="file"]#uploadImage',
    img:    '#pic_container img',
    input:  'input[type="hidden"]#hiddenval',
    name:   'photo-[rand].jpg',
    format: 'image/jpeg',
    maxSize: 10000    // 10KB
  },
  {
    file:   'input[type="file"]#manual_application',
    img:    'img#app_img',
    input:  'input[type="hidden"]#app_hid',
    name:   'application-[rand].jpg',
    format: 'image/jpeg',
    maxSize: 100000   // 100KB
  }
];

const $debugLog = document.getElementById('oho-debug');
if ($debugLog) {
  $debugLog.innerHTML = $debugLog.innerHTML + 'Injected successfully.' + '<br>';
}

let $overlay,
    $modal,
    $label,
    $select,
    $video,
    $canvas,
    $final;

let $btnRotate,
    $btnCrop,
    $btnCapture,
    $btnOk;

let _currentField;
let _currentStream;
let _cropper;

browser.storage.local.get(['oho-enabled'], function(result) {
  if (result['oho-enabled']) {
    ohoInit();
  }
});

function ohoInit() {
  const html = `
    <div class="oho-modal" id="oho-modal">
      <a href="#close" class="oho-modal__close" id="oho-close">×</a>

      <label for="oho-select" id="oho-label" class="oho-label oho-hidden">
        <span>Camera: </span>
        <select name="oho-camera" id="oho-select" class="oho-select"></select>
      </label>

      <div class="oho-modal__frame">
        <video id="oho-video" class="oho-video"></video>
        <div class="oho-canvas-wrapper">
          <canvas id="oho-canvas" class="oho-canvas" hidden></canvas>
        </div>
      </div>

      <div class="oho-modal__actions">
        <button class="oho-button" id="oho-btn-rotate"  style="min-width: 65px;" disabled>Rotate</button>
        <button class="oho-button" id="oho-btn-crop"    style="min-width: 65px;" disabled>Crop</button>
        <button class="oho-button" id="oho-btn-capture" style="min-width: 65px; margin-left: auto;" disabled>Capture</button>
        <button class="oho-button" id="oho-btn-ok"      style="min-width: 40px;">Ok</button>
      </div>
    </div>
  `;

  $overlay = document.createElement('div');
  $overlay.className = 'oho-overlay';
  $overlay.innerHTML = html;

  document.body.appendChild($overlay);

  $modal      = document.getElementById('oho-modal');
  $close      = document.getElementById('oho-close');
  $label      = document.getElementById('oho-label');
  $select     = document.getElementById('oho-select');
  $video      = document.getElementById('oho-video');
  $canvas     = document.getElementById('oho-canvas');
  // $img        = document.getElementById('oho-img');
  $btnRotate  = document.getElementById('oho-btn-rotate');
  $btnCrop    = document.getElementById('oho-btn-crop');
  $btnCapture = document.getElementById('oho-btn-capture');
  $btnOk      = document.getElementById('oho-btn-ok');

  $video.width   = frameWidth;
  $video.height  = frameHeight;

  $canvas.width  = frameWidth;
  $canvas.height = frameHeight;

  fileInputs.forEach((field, index) => {
    $file  = document.querySelector(field.file);

    if ($file) {
      $img   = document.querySelector(field.img);
      $input = document.querySelector(field.input);

      $img.classList.add('oho-processed');
      $file.setAttribute('data-oho-index', index);

      $file.addEventListener('click', function(event) {
        event.preventDefault();

        const index = this.getAttribute('data-oho-index');

        _currentField = {
          file:    document.querySelector(fileInputs[index].file),
          photo:   document.querySelector(fileInputs[index].img),
          input:   document.querySelector(fileInputs[index].input),
          name:    fileInputs[index].name,
          format:  fileInputs[index].format,
          maxSize: fileInputs[index].maxSize
        };

        $overlay.classList.add('oho-overlay--show');
      });
    }
  });

  if (navigator.mediaDevices) {
    navigator.mediaDevices.enumerateDevices().then(ohoGetDevices);
    console.log("Here1");
    // console.log(oho-camera-id);
    $select.onchange = function() {
      if (typeof _currentStream !== 'undefined') {
        stopMediaTracks(_currentStream);
      }

      const videoConstraints = {};

      if ($select.value === '') {
        videoConstraints.facingMode = 'environment';
      }
      else {
        videoConstraints.deviceId = { exact: $select.value };

        localStorage.setItem('oho-camera-id', $select.value);
      }

      const constraints = {
        video: videoConstraints,
        audio: false
      };

      ohoInitCamera(constraints);
    }
  }
}

function ohoGetDevices(mediaDevices) {
  let count = 0;
  let selectedDeviceId = localStorage.getItem('oho-camera-id');

  let $option = document.createElement('option');
      $option.innerText = 'Choose input device';
      $option.style.color = 'lightgray';
      $option.value = '';

  $select.innerHTML = '';
  $select.appendChild($option);

  mediaDevices.forEach(mediaDevice => {
    if (mediaDevice.kind === 'videoinput') {
      count++;

      const $option = document.createElement('option');
            $option.value = mediaDevice.deviceId;
            $option.selected = mediaDevice.deviceId == selectedDeviceId;

      const label = mediaDevice.label || `Camera ${count}`;
      const textNode = document.createTextNode(label);

      $option.appendChild(textNode);
      $select.appendChild($option);
    }
  });

  if (selectedDeviceId) {
    $select.onchange();
  }

  if (count > 1) {
    $select.parentNode.classList.remove('oho-hidden');
  }
  else {
    $select.parentNode.classList.add('oho-hidden');
    ohoInitCamera({ video: true });
  }
  console.log(count);
}

function ohoInitCamera(constraints) {
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => {
      _currentStream = stream;
      console.log("stream");
      $video.onloadedmetadata = function() {
        $btnCapture.disabled = false;
        $video.play();
        console.log("Camera started");

      }
      $video.srcObject = stream;

      $btnCapture.onclick = function() {
        console.log("Taken");
        if ($btnCapture.innerText !== 'Cancel') {
          $btnCapture.innerText = 'Cancel';

          $video.hidden  = true;
          $canvas.hidden = false;
          $canvas.getContext('2d').drawImage($video, 0, 0, frameWidth, frameHeight);

          _cropper = new Cropper($canvas, {
            viewMode: 1,
            aspectRatio: 2.25,
            // guides: false,
            // center: false,
            // background: false,
            // scalable: true,
            // zoomable: false,
            zoomOnTouch: false,
            // zoomOnWheel: false,
            wheelZoomRatio: 0.05,
            // dragMode: 'move',
            // dragMode: 'none',
            // autoCrop: true,
            checkOrientation:false,
            autoCropArea: 1,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready: function() {
              $btnRotate.disabled = false;
              $btnCrop.disabled   = false;
            },
            cropend: function(event) {
              let cropData = _cropper.getCropBoxData();

              if (cropData.width < 100) {
                cropData.width = 100;
              }

              if (cropData.height < 100) {
                cropData.height = 100;
              }

              _cropper.setCropBoxData(cropData);
            },
            zoom: function(event) {
              const cropperData = _cropper.getData();
              const canvasData = _cropper.getCanvasData();

              if (cropperData.rotate == 0 || cropperData.rotate == 180) {
                event.preventDefault();
              }
              else if (event.detail.ratio > event.detail.oldRatio && canvasData.width > 400) {
                event.preventDefault();
              }
              else if (event.detail.ratio < event.detail.oldRatio && canvasData.height < 300) {
                event.preventDefault();
              }
              else if (event.detail.ratio > 0.72) {
                event.preventDefault();
              }
            }
          });
        }
        else {
          $btnCapture.innerText = 'Capture';

          $canvas.hidden = true;
          $video.hidden  = false;

          $btnRotate.disabled = true;
          $btnCrop.disabled   = true;

          if (_cropper) {
            _cropper.destroy();
            _cropper = null;
          }
        }
      };

      $btnRotate.onclick = function() {
        let cropperData = _cropper.getData();

        cropperData.rotate += 90;

        if (cropperData.rotate > 270) {
          cropperData.rotate = 0;
        }

        let canvasData = _cropper.getCanvasData();

        if (cropperData.rotate == 90 || cropperData.rotate == 270) {
          _cropper.setDragMode('move');
          _cropper.zoomTo(0.25);
        }
        else {
          _cropper.setDragMode('none');
          _cropper.zoomTo(0.5);
        }

        _cropper.setData(cropperData);
      }

      $btnCrop.onclick = function() {
        _cropper.crop();
        console.log("in crop");
      }

      $btnOk.onclick = function() {
        console.log("Ok clicked");
        if (_cropper) {
          let cropData = _cropper.getCropBoxData();
          console.log("Ok clicked1yes");

          if (!cropData.width || !cropData.height) {
            const canvasData = _cropper.getCanvasData();
            console.log("Ok clicked2");

            _cropper.crop();

            cropData = {
              top:    0,
              left:   0,
              width:  canvasData.naturalWidth,
              height: canvasData.naturalHeight
            };

            _cropper.setCropBoxData(cropData);
          }
          console.log("in 1");


//        Experimenting
          // var image = new Image();
	        // image.src = _cropper.getCroppedCanvas().toDataURL('image/jpeg',0.1);
          // // let dataUR = _cropper.getCroppedCanvas().toDataURL('image/jpeg');
          // console.log(image);
//          console.log(_cropper.getCroppedCanvas());
          // console.log("NEWWWWW");

         // should be this---> var dataURL = _cropper.getCroppedCanvas().toDataURL('image/jpeg');
         var dataURL = $canvas.toDataURL('image/jpeg'); //works pretty well but without cropping it is
         // try the base64 in working.txt, put that string in dataURL

//          console.log(getImageDataSize(dataURL, _currentField.format));


          if (getImageDataSize(dataURL, _currentField.format) > _currentField.maxSize) {
            console.log("Inside 2");

            if (confirm('Photo size is more than ' + _currentField.maxSize / 1000 + 'KB. It will be automatically resized and its quality will be reduced, click Ok if yes')) {
              let ratio = 1;

              while (getImageDataSize(dataURL, _currentField.format) > _currentField.maxSize && ratio > 0) {
                ratio -= 0.125;

                // _cropper.scale(ratio);
                // dataURL = _cropper.getCroppedCanvas().toDataURL(_currentField.format);

                let canvas = $canvas;

                let canvasCopy = document.createElement('canvas');
                    canvasCopy.width  = canvas.width  * ratio;
                    canvasCopy.height = canvas.height * ratio;

                let copyContext = canvasCopy.getContext('2d');
                    copyContext.drawImage(canvas, 0, 0, canvasCopy.width, canvasCopy.height);

                dataURL = canvasCopy.toDataURL(_currentField.format);
                console.log(ratio);
              }
            }
          }


          console.log("-_-");
          document.getElementById('idproofno[0]').value=8;
          document.getElementById('spouse').value=2;
          _currentField.photo.src   = dataURL;
          _currentField.input.value = dataURL;

          let tmpFile = dataURLtoFile(dataURL, _currentField.name.replace('[rand]', new Date().getMilliseconds()));
          let ohoHack = new ClipboardEvent('').clipboardData || new DataTransfer();
              ohoHack.items.add(tmpFile);

          _currentField.file.files = ohoHack.files;

          $btnCapture.innerText = 'Cancel';
          $btnCapture.onclick();
        }

        $overlay.classList.remove('oho-overlay--show');
      }

      $close.onclick = function(event) {
        event.preventDefault();

        $btnCapture.innerText = 'Cancel';
        $btnCapture.onclick();

        $overlay.classList.remove('oho-overlay--show');
      }

      return navigator.mediaDevices.enumerateDevices();
    })
    .catch(function(err) {
      alert('Camera connection error: ' + err.message);
    });
}

function stopMediaTracks(stream) {
  stream.getTracks().forEach(track => {
    track.stop();
  });
}

function getImageDataSize(dataurl, format) {
  format = format || 'image/png';

  const head = 'data:' + format + ';base64,';

  return Math.round((dataurl.length - head.length) * 3/4);
}

function dataURLtoFile(dataurl, filename) {
  let arr  = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

  while(n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, {type: mime});
}
