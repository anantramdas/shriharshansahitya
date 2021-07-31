function startChecking() {
    if(window.location.href.indexOf('type=admin') > -1) {
        $('.overlay').hide();
        document.body.style['overflow-y'] = 'scroll';
    }
}