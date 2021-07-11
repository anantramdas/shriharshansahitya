function checkWebPSupport(feature, callback) {
    var kTestImages = {
        lossy: "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
        lossless: "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
        alpha: "UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==",
        animation: "UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA"
    };
    var img = new Image();
    img.onload = function () {
        var result = (img.width > 0) && (img.height > 0);
        callback(feature, result);
    };
    img.onerror = function () {
        callback(feature, false);
    };
    img.src = "data:image/webp;base64," + kTestImages[feature];
}

function replaceRepeat(str) {
	for (var i=0;i<=3;i++) {
		str = str.replace(RegExp(`(\\|${i})*`, 'g'), function(match) {
			return match.length ? (match.length / 2 > 2 ? `|${i}(${match.length/2})` : match) : "";
		});
		str = str.replace(RegExp(`(-${i})*`, 'g'), function(match) {
			return match.length ? (match.length / 2 > 2 ? `-${i}(${match.length/2})` : match) : "";
		});
	}
	return str;
}

function expandRepeat(str) {
	for (var i=0;i<=3;i++) {
		str = str.replace(RegExp(`\\|${i}\\((\\d*?)\\)`, 'g'), function(match, num) {
			return `|${i}`.repeat(num);
		});
		str = str.replace(RegExp(`-${i}\\((\\d*?)\\)`, 'g'), function(match, num) {
			return `-${i}`.repeat(num);
		});
	}
	return str;
}

function getImageDim(folder, count) {
	var objh = [], objw=[];
	var allDone = 0;
	var sumh = 0, sumw = 0;
	for(var i=1;i<=count;i++) {
		var img = new Image();
	    img.onload = function () {
	    	allDone++;
	    	sumh+=this.naturalHeight;
	    	sumw+=this.naturalWidth;
	    	objh[this.src.replace(/.*?(\d*)\.jpg/,'$1') - 1] = this.naturalHeight;
	    	objw[this.src.replace(/.*?(\d*)\.jpg/,'$1') - 1] = this.naturalWidth;
	    	if (allDone == count) {
	    		var avgHeight = Math.ceil(sumh/count);
	    		var avgWidth = Math.ceil(sumw/count);
	    		for(var i=0;i<=count - 1;i++) {
					objw[i] = objw[i] - avgWidth;
					objh[i] = objh[i] - avgHeight;
				}
				console.log(`ah: ${avgHeight},\naw: ${avgWidth},\nhh: '${replaceRepeat(objh.join('|').replace(/\|-/g,'-'))}',\nww: '${replaceRepeat(objw.join('|').replace(/\|-/g,'-'))}',`);
	    	}
	    };
	    img.src = `${'books'}/${folder}/${folder}_${i}.jpg`;
	}
}

var isWebPSupported;
var viewer, pageNo, isScrolling, newDim, throttleTimeout, pdfPages, bookPageCount, bookTitle;
var pageIndex = 0;
var newHeights = [], newWidths=[];
checkWebPSupport('lossy', function (feature, isSupported) {
    isWebPSupported = isSupported;
});

function getRatio(width, height, maxWidth, maxHeight) {
	return maxWidth / width;
}

function resize(width, height, maxWidth, maxHeight) {
    var ratio = getRatio(width, height, maxWidth, maxHeight);
    var newWidth = ratio * width;
    var newHeight = ratio * height;
    return {width: Math.min(newWidth, width), height: newHeight};
}

function pdfControls(pageCount) {
	return `<div id='pdfcontrols' class='show'>
	<div class="title">
		<div>${bookTitle}</div>
	</div>
	<div class="pageNo">
		<div><span>1</span>/${pageCount}</div>
	</div>
	<div class="controls">
		<img src="svg/page.svg" width="auto" height="80%"/>
		<img onclick="window.history.back();" src="svg/cross.svg" width="auto" height="80%"/>
	</div>
    </div>`;
}

function getWindowWidth() {
	return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
}

function getWindowHeight() {
	return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
}
function toggleControls() {
	if (!isScrolling) {
		$("#pdfcontrols").toggleClass("show");
	}
}
function scrollEnd() {
	isScrolling = false;
	for(var index = pageIndex - 1; index <= pageIndex + 1; index++) {
		if (index >= 0 && index <= bookPageCount) {
			var src = pdfPages[index].getAttribute('data-src');
			pdfPages[index].setAttribute('src', src);
		}
	}
}
function binarySearch(array, target) {
  let startIndex = 0;
  let endIndex = array.length - 1;
  while(startIndex <= endIndex) {
    let middleIndex = Math.floor((startIndex + endIndex) / 2);
    if(target >= array[middleIndex] && (middleIndex == array.length - 1 || target < array[middleIndex + 1])) {
      return middleIndex;
    }
    if(target > array[middleIndex]) {
      startIndex = middleIndex + 1;
    }
    if(target < array[middleIndex]) {
      endIndex = middleIndex - 1;
    }
  }
  return -1;
}
function onBookScroll() {
	var topPos = viewer.scrollTop();
	pageIndex = binarySearch(newHeights, topPos) + 1;
	pageNo.html(pageIndex + 1);
	clearTimeout(throttleTimeout);
	throttleTimeout = 0;
}
function openBook(bookName, book) {
	var title = book['title'], pageCount = book['pageCount'], bookWidth = book['w'], bookHeight = book['h'];
	var avgHeight = book['ah'];
	var avgWidth = book['aw'];
	var heightArr = expandRepeat(book['hh']).replace(/-/g, '|-').replace(/\|/g, ' ').trim().split(' ');
	var widthArr = expandRepeat(book['ww']).replace(/-/g, '|-').replace(/\|/g, ' ').trim().split(' ');
	window.pageWidth = getWindowWidth();
    window.pageHeight = getWindowHeight();
    newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
	newHeights = [], newWidths=[];
	var sumHeight = 0;
	for (var i=0;i<heightArr.length;i++) {
		var newHeight = +heightArr[i] + avgHeight;
		newHeights.push(+heightArr[i] + avgHeight);
		newWidths.push(+widthArr[i] + avgWidth);
		sumHeight += newHeight;
		if (i == 0) {
			newHeights.push(877); // not for sale page height
			sumHeight += 877;
			newWidths.push(620); //width
		}
	}

	bookPageCount = pageCount;
	bookTitle = title;
	var ext = location.host != "" && isWebPSupported ? 'webp' : 'jpg';
	var source = location.host == "" ? 'books' : isWebPSupported ? 'https://srhssa.github.io/shriharshanbooksoptimized' : 'https://srhssa.github.io/shriharshanbooks';
    var pages = [
        `${source}/${bookName}/${bookName}_1.${ext}`,
        `assets/not_for_sale.${ext}`,
    ];
	var scrollTimeout, throttle = 250;
	if (typeof viewer == 'undefined') {
		viewer = $('#pdfviewer');
		viewer.scroll(function(e) {
			isScrolling = true;
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(scrollEnd, 300);
			if (!throttleTimeout) {
				throttleTimeout = setTimeout(onBookScroll, throttle);
			}
		});
	}
    var html = `${pdfControls(pageCount)}<div id='dimWrapper' oncontextmenu="return false;" onclick='toggleControls();' style='width:${newDim.width}px;height:${sumHeight}px'>`;
  //   setInterval(function() {
  //   	var newPageWidth = getWindowWidth();
  //   	var newPageHeight = getWindowHeight();
		// if (pageWidth != newPageWidth || pageHeight != newPageHeight) {
		// 	window.pageWidth = newPageWidth;
		// 	window.pageHeight = newPageHeight;
		// 	newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
		//   	$('#dimWrapper').css({'height': newDim.height +'px', 'width': newDim.width + 'px'});	
		// }
	 // }, 1000);
    for (let index = 1; index < pageCount; index++) {
        pages.push(`${source}/${bookName}/${bookName}_${index + 1}.${ext}`);
    }

    for (let index in pages) {
    	var page = pages[index];
    	var widthRatio = newWidths[index] / newDim.width;
		newHeights[index] = (newHeights[index] / widthRatio);
    	var customStyle = '';
    	html += `<div class='pdfpage' style="flex:${newHeights[index]/sumHeight}" tabindex="${index}">
    		<img data-src='${page}' style="${customStyle}"/>
    	</div>`;
    	if (index > 0) {
			newHeights[index] += newHeights[index - 1];
		}
    }

    html += '</div>';

    $('nav').css('position', 'unset');
    $('body').css('overflow', 'hidden');
    viewer.html(html);
    pdfPages = $(".pdfpage > img");
    scrollEnd();
    viewer.show();
    viewer.scrollTop(0);
    pageNo = $('.pageNo span');
}

function closeBook() {
	window.isBookOpen = false;
	$('nav').css('position', 'sticky');
	$('body').css('overflow', '');
	viewer.hide();
	viewer.html('');
}