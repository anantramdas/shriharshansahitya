var isWebPSupported;
var viewer, pageNo, isScrolling, newDim, throttleTimeout, pdfPages, bookPageCount, bookTitle;
var pageIndex = 0;
var arrDim = [];
var sumHeight = 0;
var isLocalHost = location.host == "";

function checkWebPSupport(callback) {
	// only lossy support is checked
    var img = new Image();
    img.onload = function() {
    	isWebPSupported = img.width > 0 && img.height > 0;
        callback && callback();
    };
    img.onerror = function() {
    	isWebPSupported = false;
        callback && callback();
    };
    img.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
}

checkWebPSupport();

function expandRepeat(str) {
	if (str.indexOf('(') > -1) {
	    for (var i = 0; i <= 3; i++) {
	        str = str.replace(RegExp(`\\|${i}\\((\\d*?)\\)`, 'g'), function(match, num) {
	            return `|${i}`.repeat(num);
	        });
	        str = str.replace(RegExp(`-${i}\\((\\d*?)\\)`, 'g'), function(match, num) {
	            return `-${i}`.repeat(num);
	        });
	    }
	}
    return str.replace(/-/g, '|-').replace(/\|/g, ' ').trim().split(' ');;
}

function getRatio(width, height, maxWidth, maxHeight) {
    return maxWidth / width;
}

function resize(width, height, maxWidth, maxHeight) {
    var ratio = Math.min(getRatio(width, height, maxWidth, maxHeight), 1);
    var newWidth = ratio * width;
    var newHeight = ratio * height;
    return {
        width: newWidth,
        height: newHeight
    };
}

function onPageNoBlur(_this) {
	var num = +_this.value;
	var currentPage = pageIndex + 1;
	if (num != currentPage && num > 0 && num <= bookPageCount + 1) { // +1 for not for sale page
		gotoPage(num);
	} else {
		_this.value = currentPage;
	}
}

function onPageNoKeyUp(_this, event) {
	if (event.keyCode == 13) {
		event.preventDefault();
		_this.blur();
	}
}

function onPageNoFocus(_this) {
	_this.setSelectionRange && _this.setSelectionRange(0, _this.value.length);
}

function pdfControls(pageCount) {
    return `<div id='pdfcontrols' class='show'>
	<div class="title">
		<div>${bookTitle}</div>
	</div>
	<div class="pageNo">
		<div><input onkeyup="onPageNoKeyUp(this, event);" onfocus="onPageNoFocus(this)" onblur="onPageNoBlur(this);" type="number" value="1">/${pageCount + 1}</div>
	</div>
	<div class="controls">
		<img src="svg/list.svg"/>
		<img onclick="window.history.back();" src="svg/cross.svg"/>
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
	window.scrollPos = viewer.scrollTop();
    isScrolling = false;
    for (var index = pageIndex - 1; index <= pageIndex + 1; index++) {
        if (index >= 0 && index <= bookPageCount) {
            var src = pdfPages[index].getAttribute('data-src');
            pdfPages[index].setAttribute('src', src);
        }
    }
}

function binarySearch(array, target) {
    var startIndex = 0;
    var endIndex = array.length - 1;
    while (startIndex <= endIndex) {
        var middleIndex = Math.floor((startIndex + endIndex) / 2);
        var midValue = array[middleIndex].ratio;
        var nextValue = array[middleIndex + 1].ratio;
        if (target >= midValue && (middleIndex == array.length - 1 || target < nextValue)) {
            return middleIndex;
        }
        if (target > midValue) {
            startIndex = middleIndex + 1;
        }
        if (target < midValue) {
            endIndex = middleIndex - 1;
        }
    }
    return -1;
}

function gotoPage(pageNumber) {
	if (pageNumber > 0 && pageNumber <= bookPageCount + 1) {
		var index = pageNumber - 1;
		pdfPages[index].scrollIntoView({block: "start", inline: "start"});
		return true;
	} else {
		return false;
	}
}

function onBookScroll() {
    var topPos = viewer.scrollTop();
    pageIndex = binarySearch(arrDim, topPos / sumHeight) + 1;
    pageNo.val(pageIndex + 1);
    clearTimeout(throttleTimeout);
    throttleTimeout = 0;
}

function resizeBook() {
	if (window.isBookOpen) {
		var newPageWidth = getWindowWidth();
	    if (pageWidth != newPageWidth) {
	        var oldPos = (scrollPos || 0) / sumHeight;
	        window.pageWidth = newPageWidth;
	        window.pageHeight = getWindowHeight();
	        newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
	        sumHeight = arrDim.length;
	        for (var index = 0; index < arrDim.length; index++) {
		        var widthRatio = arrDim[index].width / newDim.width;
		        sumHeight += (arrDim[index].height / widthRatio);
		    }
		    viewer[0].scrollTo(0, oldPos * sumHeight);
	        $('#dimWrapper').css({
	            'height': sumHeight + 'px',
	            'width': newDim.width + 'px'
	        });
	    }
	}
}

function openBook(bookName, book) {
	openFullscreen();
	window.bookWidth = book['w'];
    window.bookHeight = book['h'];
    var avgHeight = book['ah'],
    	avgWidth = book['aw'];
    var arrBookDim = {
    	height: expandRepeat(book['hh']),
    	width: expandRepeat(book['ww'])
    };
    bookPageCount = book['pageCount'];
    bookTitle = book['title'];
    arrDim = [];
    pageIndex = 0;
    window.pageWidth = getWindowWidth();
    window.pageHeight = getWindowHeight();
    newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
    for (var i = 0; i < arrBookDim.height.length; i++) {
    	arrDim.push({
		    width: +arrBookDim.width[i] + avgWidth,
		    height: +arrBookDim.height[i] + avgHeight,
		});
		if (i == 0) {
			arrDim.push({
			    width: 620,
			    height: 877,
			}); // not for sale page height
		}
    }

    sumHeight = arrDim.length;

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
    var html = '';
    var pages = [];
    var ext = !isLocalHost && isWebPSupported ? 'webp' : 'jpg';
    var source = isLocalHost ? 'books' : isWebPSupported ? 'https://srhssa.github.io/shriharshanbooksoptimized' : 'https://srhssa.github.io/shriharshanbooks';
    for (var counter = 1; counter <= bookPageCount; counter++) {
        pages.push(`${source}/${bookName}/${bookName}_${counter}.${ext}`);
        if (counter == 1) {
        	pages.push(`assets/not_for_sale.${ext}`);
        }
    }
    for (var index in pages) {
        var widthRatio = arrDim[index].width / newDim.width;
        sumHeight += (arrDim[index].newHeight = arrDim[index].height / widthRatio);
    }
    var imgSrc = `src='assets/${bookName}.${isWebPSupported ? 'webp' : 'jpg'}'`;
    var isMobile = device.mobile();
    for (var index in pages) {
        var page = pages[index];
        var height = arrDim[index].newHeight;
        var tabIndex = isMobile ? '' : ` tabindex="${index}"`;
        html += `<div class='pdfpage' style="flex:${height/sumHeight}"${tabIndex}>
    		<img ${imgSrc} data-src='${page}'/>
    	</div>`;
        if (index > 0) {
            arrDim[index].ratio = arrDim[index - 1].ratio + height / sumHeight;
        } else {
            arrDim[index].ratio = height / sumHeight;
        }
        imgSrc = '';
    }
    
    html = `${pdfControls(bookPageCount)}<div id='dimWrapper' oncontextmenu="return false;" onclick='toggleControls();' style='width:${newDim.width}px;height:${sumHeight}px'>` + html + '</div>';

    $('nav').css('position', 'unset');
    $('body').css('overflow', 'hidden');
    viewer.html(html);
    pdfPages = $(".pdfpage > img");
    scrollEnd();
    viewer.show();
    viewer.scrollTop(0);
    pageNo = $('.pageNo input');
    if (typeof window.isBookOpen == 'undefined') {
	    window.addEventListener("resize", function() {
			resizeBook();
		}, false);
	    device.onChangeOrientation(function() {
		    resizeBook();
		});
	}
	window.isBookOpen = true;
}

function closeBook() {
	if (window.isBookOpen) {
	    window.isBookOpen = false;
	    $('nav').css('position', 'sticky');
	    $('body').css('overflow', '');
	    closeFullscreen();
	    viewer.hide();
	    viewer.html('');
	}
}

/* Get the documentElement (<html>) to display the page in fullscreen */
var elem = document.documentElement;

/* View in fullscreen */
function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

/* Close fullscreen */
function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
  }
}

// function getImageDim(folder, count) {
//     var objh = [],
//         objw = [];
//     var allDone = 0;
//     var sumh = 0,
//         sumw = 0;
//     for (var i = 1; i <= count; i++) {
//         var img = new Image();
//         img.onload = function() {
//             allDone++;
//             sumh += this.naturalHeight;
//             sumw += this.naturalWidth;
//             objh[this.src.replace(/.*?(\d*)\.jpg/, '$1') - 1] = this.naturalHeight;
//             objw[this.src.replace(/.*?(\d*)\.jpg/, '$1') - 1] = this.naturalWidth;
//             if (allDone == count) {
//                 var avgHeight = Math.ceil(sumh / count);
//                 var avgWidth = Math.ceil(sumw / count);
//                 for (var i = 0; i <= count - 1; i++) {
//                     objw[i] = objw[i] - avgWidth;
//                     objh[i] = objh[i] - avgHeight;
//                 }
//                 console.log(`ah: ${avgHeight},\naw: ${avgWidth},\nhh: '${replaceRepeat(objh.join('|').replace(/\|-/g,'-'))}',\nww: '${replaceRepeat(objw.join('|').replace(/\|-/g,'-'))}',`);
//             }
//         };
//         img.src = `${'books'}/${folder}/${folder}_${i}.jpg`;
//     }
// }
// function replaceRepeat(str) {
//     for (var i = 0; i <= 3; i++) {
//         str = str.replace(RegExp(`(\\|${i})*`, 'g'), function(match) {
//             return match.length ? (match.length / 2 > 2 ? `|${i}(${match.length/2})` : match) : "";
//         });
//         str = str.replace(RegExp(`(-${i})*`, 'g'), function(match) {
//             return match.length ? (match.length / 2 > 2 ? `-${i}(${match.length/2})` : match) : "";
//         });
//     }
//     return str;
// }