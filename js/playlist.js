var playlistData = {
  'ईश्वर जीव परमात्मा का ज्ञान': {link: 0, duration: 2877},
  'नाम रूप लीला धाम एवं रस निष्पत्ति': {link: 0, duration: 3549},
  'आचार्यानुवर्तन एवं परमात्म प्राप्ति': {link: 0, duration: 1930},
  'रसोपासना तथा सत्संग': {link: 0, duration: 1856},
  'भगवान से अपनापन': {link: 0, duration: 958}, 
};

var audioLinks = [
	'https://ia601406.us.archive.org/25/items/shriharshanvani_1/',
]

var playlistItems = [];

for(var file in playlistData) {
	var listItem = playlistData[file];
	playlistItems.push({
		file: './audio/' + file + '.mp3',
		title: file,
		duration: listItem.duration,
		weblink: audioLinks[listItem.link] + file + '.mp3',
	});
}