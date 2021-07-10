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

var isWebPSupported;
var viewer, pageNo, isScrolling, newDim, throttleTimeout, pdfPages, bookPageCount, bookTitle;
var pageIndex = 0;
checkWebPSupport('lossy', function (feature, isSupported) {
    isWebPSupported = isSupported;
});

function resize(width, height, maxWidth, maxHeight) {
    var ratio = Math.min(maxWidth / width, maxHeight / height);
    var newWidth = ratio * width;
    var newHeight = ratio * height;
    return {width: newWidth, height: newHeight};
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
		<img onclick="closeBook();" src="svg/cross.svg" width="auto" height="80%"/>
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
function onBookScroll() {
	pageIndex = Math.max(1, Math.ceil(viewer.scrollTop()/newDim.height)) - 1;
	pageNo.html(pageIndex + 1);
	clearTimeout(throttleTimeout);
	throttleTimeout = 0;
}
function openBook(bookName, title, pageCount, bookWidth, bookHeight) {
	bookPageCount = pageCount;
	bookTitle = title;
	var ext = location.host != "" && isWebPSupported ? 'webp' : 'jpg';
	var source = location.host == "" ? 'books' : isWebPSupported ? 'https://srhssa.github.io/shriharshanbooksoptimized' : 'https://srhssa.github.io/shriharshanbooks';
    var pages = [
        `${source}/${bookName}/${bookName}_1.${ext}`,
        `assets/not_for_sale.${ext}`,
    ];
    window.pageWidth = getWindowWidth();
    window.pageHeight = getWindowHeight();
	newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
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
    var html = `${pdfControls(pageCount)}<div id='dimWrapper' oncontextmenu="return false;" onclick='toggleControls();' style='height:${pageCount * newDim.height}px;width:${newDim.width}px;'>`;
    setInterval(function() {
    	var newPageWidth = getWindowWidth();
    	var newPageHeight = getWindowHeight();
		if (pageWidth != newPageWidth || pageHeight != newPageHeight) {
			window.pageWidth = newPageWidth;
			window.pageHeight = newPageHeight;
			newDim = resize(bookWidth, bookHeight, pageWidth, pageHeight);
		  	$('#dimWrapper').css({'height': newDim.height +'px', 'width': newDim.width + 'px'});	
		}
	 }, 1000);
    for (let index = 1; index < pageCount; index++) {
        pages.push(`${source}/${bookName}/${bookName}_${index + 1}.${ext}`);
    }

    for (let index in pages) {
    	var page = pages[index];
    	var customStyle = '';
    	if (index == 1) {
    		customStyle = 'background: #f7f7f7;object-fit: contain;';
    	}
    	html += `<div class='pdfpage' tabindex="${index}">
    		<img data-src='${page}' style="${customStyle}"/>
    	</div>`;
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
	$('nav').css('position', 'sticky');
	$('body').css('overflow', '');
	viewer.hide();
	viewer.html('');
}