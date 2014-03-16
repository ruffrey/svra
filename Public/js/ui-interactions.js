function SwitchExperiment(expName) {

    $.getScript('js/exp/' + expName + ".js", function(script) {

    }).error(function(){
        alert('Error loading experiment: ' + expName);
    });

    $('#tabnav a').attr('disabled', 'disabled');

}

function StopExperiment(expName) {
    $('#tabnav a').removeAttr('disabled');
}

// jQuery Init
$(function(){

    $('#exp-modal').on('shown.bs.modal', function () {
        $(this)
        .find('.modal-dialog')
        .css({
            width:'100%',
            height:'100%', 
            'max-height':'100%'
        });
    });

	$('#tabnav a').click(function (e) {
	  e.preventDefault();
	  $(this).tab('show');
	  history.pushState({}, $(this).text(), location.pathname + $(this).attr('href'));
	  SwitchExperiment( $(this).attr('href').replace('#','') );
	});

	if(location.hash)
	{
		$('a[href="' + location.hash + '"]').click();
	}

	initAudio(function(){
        calibrate();
    });


    $('#exp-continue').click(function() {
        // $('#exp-score').removeClass('label-default').addClass('label-inverse');
        $('#exp-score')
        .css('opacity',1)
        .css('backgroundColor','#000000')
        .css('color', '#ffffff');

        $(this).hide();
        $('#exp-pause')
        .css('opacity',0)
        .show();

        setTimeout(function(){
            $('#exp-pause').fadeTo(1,1000);
        }, CurrentExperiment.loopInterval || 5000);
    });

    $('#exp-pause').click(function() {
        var pause = $(this);

        $('#exp-score')
        .animate({
            opacity: 1,
            backgroundColor: '#f9f9f9',
            color: '#3333FF'
        }, 500);

        $(this).hide();
        $('#exp-continue').fadeIn(400);

    });

    SetScore();
    
    // $('#exp-modal').on('shown.bs.modal', function(){
    //     StartExperiment();
    // });

});

function StartExperiment() {
    SCORE = 0; 
    SetScore();
    console.log('experiment started inside StartExperiment()', new Date());
    CurrentExperiment.start();
    
    $('#exp-done,#exp-continue').fadeOut(200);
    $('#exp-pause').slideDown(350);
}

function EndExperiment() {
    $('#exp-done').fadeIn(350);
    $('#exp-pause').hide(200);
}

function SetScore() {
    $('#exp-score, #score')
    .each(function(){

        var origColor = $(this).css('backgroundColor');

        $(this)
        .css('backgroundColor', '#FFAD33')
        .css('color', '#000000');

        $(this).text( SCORE.toString() );

        $(this).animate({
            backgroundColor: origColor,
            color: '#ffffff'
        }, 600);

    });
    
}

function RemoveData(ix, recs) {
    if(confirm('Really delete record with ' + recs + ' data points?'))
    {
        store.removeExperiment(ix);
        ShowDataManager();
    }
}

function datarow(d) {
    return '<tr>'
            + '<td><button class="btn btn-info" onclick="DownloadData('+d.storageIndex()+');"><i class="glyphicon glyphicon-download"></i></button></td>'
            + '<td>'+d.created().toFormat('DDD MMM D, YYYY H:MI PP') + '</td>'
            + '<td>'+d.method()+'</td>'
            + '<td>'+(d.records.get().length-1)+'</td>'
            + '<td><button class="btn btn-danger" onclick="RemoveData('+d.storageIndex()+','+(d.records.get().length-1)+');"><i class="glyphicon glyphicon-remove"></i></button></td>'
        + '</tr>';
}


function IncrementScore(incr) {

    incr = incr || 1;
    SCORE += incr;

    SetScore();

}

function PlayBeep() {
    $('#beep')[0].play();
}
function PlayEndBeep() {
    $('#end-beep')[0].play();
}


function ShowDataManager() {
    var $tbody = $('#datamanager table#data-table tbody');

    var allRecords = store.getExperiments();
    var rowhtml = allRecords.map(datarow).join('');

    $tbody.empty().append( rowhtml );

    $('#datamanager').modal('show');
}

function DownloadData(ix) {

    var data = store.getExperiments(ix);

    var downloadData = encodeURIComponent(data.records.get().map(function(r) {
        return r.join(',');
    }).join('\n'));

    var link = window.document.createElement('a');
    link.href = "data:application/octet-stream," + downloadData;
    link.download = data.method() + ' ' + data.created() + '.csv';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
    
}

if(env=="production")
{
	window.onbeforeunload = function() {
		return "Careful when refreshing the page!";
	}
}
