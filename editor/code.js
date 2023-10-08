let isWebPSupported, activeBook;
var isLocalHost = location.host == "";
function checkWebPSupport(callback) {
    // only lossy support is checked
    var img = new Image();
    img.onload = function () {
        isWebPSupported = img.width > 0 && img.height > 0;
        callback && callback();
    };
    img.onerror = function () {
        isWebPSupported = false;
        callback && callback();
    };
    img.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
}

checkWebPSupport();
function loadImages() {
    let pages = [];
    var ext = !isLocalHost && isWebPSupported ? 'webp' : 'jpg';
    // var domain = getDomain();
    // var source = isLocalHost ? 'books' : isWebPSupported ? `https://${domain}.github.io/shriharshanbooksoptimized` : `https://${domain}.github.io/shriharshanbooks`;
    var source = isLocalHost ? '../books' : isWebPSupported ? `https://shriharshanbooksoptimized.pages.dev/` : `https://shriharshanbooks.pages.dev/`;
    var folder = !isLocalHost && isWebPSupported ? (activeBook.folderWebP || activeBook.id) : activeBook.id;
    var missingPages = activeBook['missing'] = activeBook['missing'] || {};
    var missingTotal = 0;
    for (var pg in missingPages) {
        missingTotal += missingPages[pg];
    }
    for (var counter = 1; counter <= activeBook.pageCount - missingTotal; counter++) {
        var missingPg = missingPages[counter] || 0;
        pages.push(`${source}/${folder}/${activeBook.id}_${counter}.${ext}`);
        for (var mIndex = 0; mIndex < missingPg; mIndex++) {
            pages.push(`${source}/${folder}/${activeBook.id}_${counter}.${mIndex + 1}.${ext}`);
        }
    }
    return pages;
}
function loadJS(FILE_URL, onSuccess, onError, async = true) {
    let scriptEle = document.createElement("script");

    scriptEle.setAttribute("src", FILE_URL);
    scriptEle.setAttribute("type", "text/javascript");
    scriptEle.setAttribute("async", async);

    document.body.appendChild(scriptEle);

    // success event 
    scriptEle.addEventListener("load", () => {
        onSuccess && onSuccess();
    });
    // error event
    scriptEle.addEventListener("error", (ev) => {
        onError && onError();
    });
}
function openFullscreen() {
    let element = document.getElementById('screen');
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();     // Firefox
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();  // Safari
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();      // IE/Edge
    }
}

function getAbcChar(number) {
    if (number <= 26) {
        return String.fromCharCode(64 + number);
    } else if (number <= 52) {
        return String.fromCharCode(96 + number - 26);
    }
}
let dbTimer, networkTroubleCounter = 0;
function triggerDBSave(words) {
    storeData(pageIndex, words);
    clearTimeout(dbTimer);
    networkTroubleCounter++;
    dbTimer = setTimeout(showNetworkTrouble, 2000);
}

function storeData(pageIndex, words) {
    // https://www.slidesmaker.me/blog/firebase-realtime-database-crud-operations-javascript
    let data = {};
    let pageNum = pageIndex + 1;
    let map = lineMap[pageNum];
    let val = map ? 1 : -1;
    let path;
    if (words) {
        data[pageNum] = {};
        console.log(words)
        for (let line in words) {
            let cL = getAbcChar(+line);
            let cW = words[line].map(getAbcChar).join('');
            data[pageNum][cL] = data[pageNum][cL] || '';
            data[pageNum][cL] += cW;
        }
        path = activeBook.id + '/words';
    } else {
        data[pageNum] = map ? getAbcChar(map.start) + getAbcChar(map.end - map.start + 1) : null;
        path = activeBook.id + '/pages';
    }
    console.log(data)
    database.ref(path).update(data).then(function() {
        console.log('success');
        networkTroubleCounter--;
        if (networkTroubleCounter == 0) {
            clearTimeout(dbTimer);
            hideNetworkTrouble();
        }
    });
}

function showNetworkTrouble() {
    networkTrouble.style.display = 'flex';
}
function hideNetworkTrouble() {
    networkTrouble.style.display = 'none';
}