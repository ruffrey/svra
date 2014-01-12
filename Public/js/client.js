$(function(){

	$('#tabnav a').click(function (e) {
	  e.preventDefault();
	  $(this).tab('show');
	  location.hash = $(this).attr('href');
	});

	if(location.hash)
	{
		$('a[href="' + location.hash + '"]').click();
	}
});


window.onbeforeunload = function() {
	return "Careful when refreshing the page!";
}