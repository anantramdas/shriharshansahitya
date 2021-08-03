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
    viewer.css('overflow', 'scroll');
}

function onPageNoFocus(_this) {
    viewer.css('overflow', 'hidden');
}

function onPageNoKeyUp(_this, event) {
	if (event.keyCode == 13) {
		event.preventDefault();
		_this.blur();
	}
}

function pdfControls() {
	var tocIcon = booksToc[bookName] ? `<img onclick="openToc();" src="svg/list.svg"/>` : '';
    return `<div id='pdfcontrols' class='show'>
	<div class="pageNo">
		<div><input onkeyup="onPageNoKeyUp(this, event);" onfocus="onPageNoFocus(this);" onblur="onPageNoBlur(this);" type="number" value="1">/${bookPageCount + 1}</div>
	</div>
	<div class="title">
		${bookTitle}
	</div>
	<div class="controls">
		${tocIcon}
		<img onclick="window.history.back();closeBook();" src="svg/cross.svg"/>
	</div>
    </div>`;
}

function renderToc() {
	var items = booksToc[bookName];
	var tocHtml = '';
	for (var pageNum in items) {
		var tocItem = items[pageNum];
		tocHtml += `<div onclick='closeToc(${+pageNum + 1})' class='tocItem'>${tocItem}</div>`;
	}
	return `<div id='tocMenu'>
	<div class="menu">
		<div class="title">
			${bookTitle}
		</div>
		<div class="toc">
			${tocHtml}
		</div>
	</div>
	<div onclick="closeToc();" style="flex-grow:1;">
	</div>
    </div>`;
}

function openToc() {
	$("#tocMenu").addClass('show');
	viewer.addClass('overflow-hidden');
	var activeToc = $('.activeToc');
	if (activeToc.length) {
		activeToc[0].scrollIntoView({block: "center", inline: "start"});
	}
}

function closeToc(pageNum) {
	viewer.removeClass('overflow-hidden');
	if (pageNum) {
		gotoPage(pageNum);
	}
	$("#tocMenu").removeClass('show');
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

function scrollEnd(skipSave) {
	window.scrollPos = viewer.scrollTop();
    window.oldPos = (window.scrollPos || 0) / sumHeight;
    isScrolling = false;
    for (var index = Math.max(0, pageIndex - 1); index <= pageIndex + 5 && index <= bookPageCount; index++) {
    	var src = pdfPages[index].getAttribute('data-src');
        if (src) {
            pdfPages[index].setAttribute('src', src);
            pdfPages[index].setAttribute('data-src', '');
        }
        if (!((index ? arrDim[index - 1].ratio : 0) * sumHeight - scrollPos <= pageHeight)) {
        	break;
        }
    }
    if (!skipSave) {
        localStorage[bookName] = pageIndex + 1;
    }
}

function binarySearch(array, target, prop) {
    var startIndex = 0;
    var endIndex = array.length - 1;
    while (startIndex <= endIndex) {
        var middleIndex = Math.floor((startIndex + endIndex) / 2);
        var midValue = array[middleIndex];
        var nextValue = array[middleIndex + 1];
        if (prop) {
        	midValue = midValue[prop];
        	nextValue = nextValue[prop];
        }
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
		viewer[0].scrollTo(0, index == 0 ? 0 : ((arrDim[index - 1].ratio * sumHeight) + 5));
		return true;
	} else {
		return false;
	}
}
var currentTitleIndex;
function setTitle() {
    if (booksToc[bookName]) {
    	var pageNums = Object.keys(booksToc[bookName]);
    	var i = binarySearch(pageNums, pageIndex);
    	if (i != currentTitleIndex) {
    		currentTitleIndex = i;
    		$(".activeToc").removeClass('activeToc');
    		if (i == -1) {
    			$("#pdfcontrols .title").html(bookTitle);
    		} else {
    			$("#pdfcontrols .title").html(booksToc[bookName][pageNums[i]]);
    			$(".tocItem").eq(currentTitleIndex).addClass('activeToc');
    		}
    	}
    }
}

function onBookScroll() {
    var topPos = viewer.scrollTop();
    pageIndex = binarySearch(arrDim, topPos / sumHeight, 'ratio') + 1;
    pageNo.val(pageIndex + 1);
    setTitle();
    clearTimeout(throttleTimeout);
    throttleTimeout = 0;
}

function resizeBook() {
	if (window.isBookOpen) {
		var newPageWidth = getWindowWidth();
	    if (Math.abs(pageWidth - newPageWidth) > 20) {
	        window.pageWidth = newPageWidth;
	        window.pageHeight = getWindowHeight();
	        newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
	        sumHeight = 0;
	        for (var index = 0; index < arrDim.length; index++) {
		        var widthRatio = arrDim[index].width / newDim.width;
		        sumHeight += (arrDim[index].height / widthRatio);
		    }
            $('#dimWrapper').css({
                'height': sumHeight + 'px',
                'width': newDim.width + 'px'
            });
            viewer[0].scrollTo(0, (window.oldPos || 0) * sumHeight);
	    }
	}
}

function getDomain() {
    var arrDomain = ['srhssa', 'anantramdas', 'shriharshansahitya'];
    var index = new Date().getDate() % 3;
    return arrDomain[index];
}

function openBook(bookName, book) {
	currentTitleIndex = null;
	window.bookName = bookName;
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

    sumHeight = 0;

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
    var domain = getDomain();
    var source = isLocalHost ? 'books' : isWebPSupported ? `https://${domain}.github.io/shriharshanbooksoptimized` : `https://${domain}.github.io/shriharshanbooks`;
    var folder = !isLocalHost && isWebPSupported ? (book.folderWebP || bookName) : bookName;

    for (var counter = 1; counter <= bookPageCount; counter++) {
        pages.push(`${source}/${folder}/${bookName}_${counter}.${ext}`);
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
    
    html = `${pdfControls()}<div onclick='toggleControls();'><div id='dimWrapper' oncontextmenu="return false;" style='width:${newDim.width}px;height:${sumHeight}px'>` + html + '</div></div>' + renderToc();

    $('nav').css('position', 'unset');
    $('body').css('overflow-y', 'hidden');
    viewer.html(html);
    pdfPages = $(".pdfpage > img");
    viewer.show();
    var savedIndex = +localStorage[bookName];
    if (savedIndex > 0 && savedIndex <= arrDim.length) {
        gotoPage(savedIndex);
    } else {
        scrollEnd(true);
        viewer.scrollTop(0);
    }
    pageNo = $('.pageNo input');
    if (typeof window.isBookOpen == 'undefined') {
	    window.addEventListener("resize", function() {
			resizeBook();
		}, false);
	 //    device.onChangeOrientation(function() {
		//     resizeBook();
		// });
	}
	window.isBookOpen = true;
}

function closeBook() {
	if (window.isBookOpen) {
	    window.isBookOpen = false;
	    $('nav').css('position', 'sticky');
	    $('body').css('overflow-y', 'scroll');
	    viewer.hide();
	    viewer.html('');
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