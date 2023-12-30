var prepdata = [];
var pdata = [];
var solvedsoluton = '';
var sumcache = [];
var eset = 10;
var load_sums_wait = 0;

$(document).ready(function() {
	$.getJSON('expdata.json', function(data) {
		var temphead = '';
		data.forEach(function(batt, i) {
			pdata.push({
				'opp': batt.opp,
				'exp10': batt.e10,
				'exp50': batt.e50,
				'exp100': batt.e100,
				'exp150': batt.e150,
				'head': batt.head,
				'btid': batt.btid,
				'base': batt.base
			});
		});
		pdata.sort(function(a, b) {
			return b.exp10 - a.exp10;
		});
		pdata.forEach(function(batt, i) {
			if(typeof(batt.opp) !== "undefined") {
				$('#bside').append('<div id="batt' + i + '" class="btn btn-default battler bg-' + toLower(batt.head) + '" data-exp10="' + batt.exp10 + '" data-exp50="' + batt.exp50 + '" data-exp100="' + batt.exp100 + '" data-exp150="' + batt.exp150 + '" data-opp="' + batt.opp + '" data-head="' + toLower(batt.head) + '" data-btid="' + batt.btid + '" data-base="' + batt.base + '" style="padding-top:14px;">' + '<b style="font-size: 13px;">' + batt.opp + '</b><br>' + '<span style="font-size: 8px; font-weight: bold;">(' + batt.head.replace(/-/g, ' ').toUpperCase() + ')</span><br>' + '<span class="exp badge text-bg-light" style="font-size: 12px;"> EXP: ' + numberWithCommas(batt.exp10) + '</span>' + '</div>');
			}
		});
		$('#bside').data('dataset', eset);
		//Run this after pdata is populated
		//load_sums loads the 'eset' set
		load_sums(function() {
			if($('#exp2target').data('num') > 0) findPossibleCombo();
		});
	});

	// Handle click on trainers
	$(document).on('click', ".battler", function(e) {
		var bid = $(this).attr('id').substring(4);
		addBattleEntry(bid, $(this).data('opp'), $(this).data('exp' + eset), $(this).data('head'), $(this).data('btid'), $(this).data('base'));
		calcTotals();
	});

	// Handle click on battle item close button
	$(document).on('click', ".btclose .close", function(e) {
		var btitem = $(this).closest('tr.btitem');
		var battles = btitem.find('.battles').text();
		if(battles > 1) {
			battles -= 1;
			var exp = btitem.find('.exp').data('num');
			btitem.find('.battles').text(battles);
			btitem.find('.total').data('num', battles * exp).text(numberWithCommas(battles * exp));
		} else {
			btitem.remove();
		}
		calcTotals();
	});

	// Handle click on clear solution button
	$(document).on('click', "#clearsol", function(e) {
		$('#battletable tbody tr').remove();
		calcTotals();
	});

	// Handle input change in entry form
	$('#entryform input').on('change', function() {
		var currExp = checkAndFixExp($('#currentExp').val());
		var targExp = checkAndFixExp($('#targetExp').val());
		var calcExp = checkAndFixExp($('#bttotal').data('num'));
		if(currExp == 0 || targExp == 0) {
			removeAlert();
			return;
		} else if(targExp < currExp) {
			createAlert('error', 'Current Exp appears to be higher than Target Exp');
		} else if(currExp < 100000 || targExp < 100000) {
			createAlert('error', 'This calculator only works for pokemon that are lvl 100');
		} else if(targExp == currExp) {
			createAlert('success', 'You are already at the Target Exp!');
		} else if(targExp - currExp - calcExp < 4 && targExp - currExp - calcExp > 0) {
			createAlert('warning', 'It is not possible to obtain less than 4 exp from a battle!');
		} else {
			//Check against limits
			expsets = [10, 50, 100, 150];
			//Error Check
			error = 0;
			for(i = 0; i <= expsets.length; i++) {
				expset = expsets[i];
				if(currExp < expset * 1000000 && targExp > expset * 1000000) {
					createAlert('warning', 'Exp received is different when your Pokemon has less than ' + numberWithCommas(expset * 1000000) + ' exp from when it has more.' + '<br>This calculator will not work in such a situation. <br>Try getting your exp above this threshold and Try Again.');
					error = 1;
					break;
				}
			}
			if(!error) {
				for(i = 0; i <= expsets.length; i++) {
					if(currExp < expsets[i] * 1000000) {
						eset = expsets[i];
						load_sums();
						break;
					}
				}
				removeAlert();
				var remaining = targExp - currExp - calcExp;
				$('#exp2target').text(numberWithCommas(remaining)).data('num', remaining);
				//console.log('exp2target updated!');
				if(!$.isEmptyObject(pdata) && !$.isEmptyObject(prepdata) && remaining >= 24) findPossibleCombo();
			}
		}
	});

	//$('#entryform input:first-of-type').trigger('change');
	// Tooltip initialization
	$('[data-toggle="tooltip"]').tooltip();

	// Note toggle button
	$(document).on('click', "#note", function(e) {
		$('#infobox2').slideUp();
		$('#infobox').slideDown();
		$('#bside').css('height', '80vh');
		$("#note").html("Hide Note and Usage");
		$('#note').attr("class", "btn btn-sm btn-info")
		$('#note').attr("id", "hide")
	});
	// Hide note button
	$(document).on('click', "#hide", function(e) {
		$('#infobox').slideUp();
		$('#infobox2').slideDown();
		$('#bside').css('height', '92vh');
		$("#hide").html("Note and Usage");
		$('#hide').attr("class", "btn btn-sm btn-info")
		$('#hide').attr("id", "note")
	});
	//Load Solution button
	$(document).on('click', "#loadsolution", function(e) {
		$('#targetbox').css("color", "black");;
		$('#battletable').fadeIn();
		removeAlert();
		loadSolution();
	});

    //Training Accounts (Normal/Inverse)
	$("#battnormal, #battinverse").click(function () {
        var selectedTrainer = $("#s-trainer").val();
        var isInverse = $(this).attr("id") === "battinverse";
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        var baseURL = isMobile ? "https://m.delugerpg.com" : "https://www.delugerpg.com";
        var battleURL = `${baseURL}/battle/computer/u/${selectedTrainer}${isInverse ? '/inverse' : ''}`;
        window.open(battleURL, '_blank');
    });
});


function toLower(x) {
	return x.toLowerCase();
}

function ucfirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function checkAndFixExp(num) {
	num = num.toString().replace(/,/g, '');
	num = Math.abs(parseInt(num, 10));
	return num;
}

function createAlert(type, message) {
	var aclass = '';
	switch(type) {
		case 'error':
			aclass = 'danger';
			break;
		case 'warn':
		case 'warning':
			aclass = 'warning';
			break;
		case 'success':
			aclass = 'success';
			break;
		default:
			aclass = 'info';
			break;
	}
	var alert = '' + '<div class="alert alert-' + toLower(aclass) + ' alert-dismissible fade show" style="padding-right: 8px;" role="alert">' + '<button class="btn-close" aria-label="Close" data-dismiss="alert" type="button">' + '<span aria-hidden="true"></span>' + '</button>' + '<strong>' + ucfirst(type) + '!</strong> ' + message + '</div>';
	removeAlert();
	$('#targetbox').prepend(alert);
}

function removeAlert() {
	if($('#targetbox .alert').length) $('#targetbox .alert').remove();
}

function calcTotals() {
	var total = 0;
	$.each($('#battletable .btitem .total'), function() {
		//console.log($(this).data('num'));
		total += $(this).data('num');
	});
	$('#bttotal').text(numberWithCommas(total)).data('num', total);
	$('#entryform input:first-of-type').trigger('change');
}

function findPossibleCombo() {
	var target = $('#exp2target').data('num');
	//console.log('Triggered! ' + target);
	strat = 1;
	solvedsoluton = solution = '';
	while(strat) {
		switch(strat) {
			case 1: //Use Top 10 to bring down exp to below 5000
				var pieces = loadTrainers4Calc(10, 100000);
				var spot = 0;
				while(target > pieces[9] && typeof(pieces[spot]) !== 'undefined') {
					if(target >= pieces[spot]) {
						if(target - pieces[spot] < 1500) {
							spot++;
							continue;
						}
						solution = solution + '+' + pieces[spot];
						target -= pieces[spot];
					} else {
						spot++;
					}
				}
				//console.log('Solution:' + solution);
				//console.log('Remaining: ' + target);
				if(typeof(prepdata[target]) !== 'undefined') {
					//console.log('Found Solution for remaining: ' + prepdata[ target ]);
					solution = solution + '+' + prepdata[target];
					target = 0;
					strat = 0;
				} else {
					strat = 2;
				}
				break;
			case 2: //Use few trainers to reduce target until result is found in prepdata
				var pieces = loadTrainers4Calc(10, target);
				//console.log(pieces);
				if(target > pieces[pieces.length - 1]) {
					for(var i = 0; i < pieces.length; i++) {
						if(target >= pieces[i]) {
							var newtarg = target - pieces[i];
							if(typeof(prepdata[newtarg]) !== 'undefined') {
								//console.log('Found Solution for remaining for '+newtarg+': ' + prepdata[ newtarg ]);
								solution = solution + '+' + pieces[i] + '+' + prepdata[newtarg];
								target = target - pieces[i] - newtarg;
								break;
							}
						}
					}
				}
				strat = 0;
				break;
		}
	}
	if(target == 0) {
		//console.log('Final Solution: ' + solution);
		solvedsoluton = solution;
		createAlert('success', 'A solution has been calculated for this target exp.<br><br><button id="loadsolution" class="btn btn-sm btn-success">Load Solution</button>');
	} else {
		console.log('No Solution');
		solvedsoluton = '';
	}
}

// Load Solution Function
function loadSolution() {
	var exps = solvedsoluton.split('+').filter(Boolean);
	//console.log(exps);
	for(var i = 0; i < exps.length; i++) {
		var trainer = findTrainerByExp(exps[i]);
		//console.log(trainer);
		addBattleEntry(trainer.id, trainer.opp, trainer['exp' + eset], trainer.head, trainer.btid, trainer.base);
	}
	calcTotals();
}

// Load Trainers for Calculation Function
function loadTrainers4Calc(num, max) {
	var all_trainers = [];
	all_trainers = pdata;
	all_trainers.sort(function(a, b) {
		return b['exp' + eset] - a['exp' + eset];
	});
	//console.log(all_trainers);
	var count = 0;
	var ret_trainers = [];
	all_trainers.forEach(function(batt, i) {
		if(count >= num) return;
		if(batt['exp' + eset] <= max) {
			ret_trainers.push(batt['exp' + eset]);
			count++;
		}
	});
	return ret_trainers;
}

// Find Trainer by Experience Function
function findTrainerByExp(exp) {
	var trainer = [];
	for(var i = 0; i < pdata.length; i++) {
		if(pdata[i]['exp' + eset] == exp) {
			trainer = pdata[i];
			break;
		}
	}
	trainer['id'] = $('.battler b').filter(function(i) {
		return $(this).text() === trainer.opp
	}).closest('.battler').attr('id').substring(4);
	//console.log(trainer);
	return trainer;
}


// Add Battle Entry Function
function addBattleEntry(bid, opp, exp, head, btid, base) {
    if ($('#bt_' + bid).length) {
        var battles = $('#bt_' + bid + ' .battles').text() * 1 + 1;
        $('#bt_' + bid + ' .battles').text(battles);
        $('#bt_' + bid + ' .total').data('num', battles * exp).text(numberWithCommas(battles * exp));
    } else {
        var html = '';
        html = '<tr class="btitem bg-' + toLower(head) + '" id="bt_' + bid + '">' +
            '<td class="name" style="text-align:left; font-size:12px; text-transform: uppercase;">' + opp + ' (' + head.replace(/-/g, ' ') + ')</td>' +
            '<td class="battles" style="text-align:center">1</td>' +
            '<td class="exp" data-num="' + exp + '" style="text-align:center">' + numberWithCommas(exp) + '</td>' +
            '<td class="total" data-num="' + exp + '" style="text-align:center">' + numberWithCommas(exp) + '</td>' +
			'<td class="" style="text-align:center">' + getButtonsHtml(base, btid) + '</td>' +
            '<td class="btclose" style="text-align:right;"><span badge text-bg-light class="close">&nbsp;×&nbsp;</span></td>' +
            '</tr>';

        $('#battletable').append(html);
    }
}

// Function to check if the device is mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Function to get the buttons HTML based on button id
function getButtonsHtml(base, btid) {
    var mobilePrefix = isMobile() ? 'https://m.delugerpg.com' : 'https://www.delugerpg.com';
    var battleLink = '';

    switch (base) {
        case 'gym':
            battleLink = mobilePrefix + '/battle/gym/' + btid;
            return '<button id="gym" class="btn btn-primary btn-sm btn-action" style="--bs-btn-padding-y: .1rem; --bs-btn-padding-x: .6rem; --bs-btn-font-size: .75rem;" onclick="window.open(\'' + battleLink + '\', \'_blank\');">Battle</button>';

        case 'trainer':
            return '<div class="btn-group btn-group-sm" role="group"><button id="normal" class="btn btn-primary btn-sm btn-action" style="--bs-btn-padding-y: .1rem; --bs-btn-padding-x: .6rem; --bs-btn-font-size: .75rem;" onclick="redirectBattle(\'trainer\', ' + btid + ', false);">Normal</button><button id="inverse" class="btn btn-dark btn-sm btn-action" style="--bs-btn-padding-y: .2rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;" onclick="redirectBattle(\'trainer\', ' + btid + ', true);">Inverse</button></div>';

        case 'pokemon':
            battleLink = isMobile() ? mobilePrefix + '/home#maps' : 'https://www.delugerpg.com/home#maps';
            return '<button id ="maps" class="btn btn-primary btn-sm btn-action" style="--bs-btn-padding-y: .1rem; --bs-btn-padding-x: .6rem; --bs-btn-font-size: .75rem;" onclick="window.open(\'' + battleLink + '\', \'_blank\');">Go to Maps</button>';

        case 'training':
            return '<button id="training" class="btn btn-primary btn-sm btn-action" style="--bs-btn-padding-y: .1rem; --bs-btn-padding-x: .6rem; --bs-btn-font-size: .75rem;" data-bs-toggle="modal" data-bs-target="#train">Battle</button>';

        default:
            return '';
    }
}

// Function to redirect based on battle type and inverse condition
function redirectBattle(battleType, btid, isInverse) {
    var mobilePrefix = isMobile() ? 'https://m.delugerpg.com' : 'https://www.delugerpg.com';
    var battleLink = isInverse ? mobilePrefix + '/battle/' + battleType + '/' + btid + '/inverse' : mobilePrefix + '/battle/' + battleType + '/' + btid;
    window.open(battleLink, '_blank');
}




function ucfirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function toLower(x) {
	/*console.log(x);*/
	if(typeof x == 'undefined') return '';
	return x.toLowerCase();
}

// Load Sums Function
function load_sums(callback) {
	if(load_sums_wait) {
		setTimeout(function() {
			load_sums(callback);
		}, 2000);
		return;
	}
	if(!(eset in sumcache)) {
		load_sums_wait = 1;
		$.getJSON('data/sums_sub' + eset + '.json', function(data) {
			prepdata = data;
			for(var i = 0; i < pdata.length; i++) {
				if(typeof(pdata[i]['exp' + eset]) !== 'undefined') {
					prepdata[pdata[i]['exp' + eset]] = pdata[i]['exp' + eset];
				}
			}
			sumcache[eset] = prepdata;
			load_sums_wait = 0;
			solvedsoluton = '';
			reload_exps();
			if(callback) callback();
		});
	} else {
		prepdata = sumcache[eset];
		solvedsoluton = '';
		reload_exps();
		if(callback) callback();
	}
}

// Reload Experiences Function
function reload_exps() {
	dataset = $('#bside').data('dataset');
	if(dataset != eset) {
		$('#bside .battler').each(function() {
			newexp = $(this).data('exp' + eset);
			$(this).find('.exp').text(numberWithCommas(newexp));
		});
		$('#bside').data('dataset', eset);
	}
}
