var prepdata = [];
var pdata = [];
var solvedsoluton = '';
var sumcache = [];
var eset = 25;
var load_sums_wait = 0;

$(document).ready(function() {
	$.getJSON('expdata.json?v=20190919', function(data) {
		var temphead = '';
		data.forEach(function (batt,i) {
			pdata.push({
				'opp' : batt.opp,
				'exp25' : batt.e25,
				'exp50' : batt.e50,
				'exp75' : batt.e75,
				'exp100' : batt.e100,
				'head' : batt.head
			});
		});
		pdata.sort(function(a,b) {
			return b.exp25 - a.exp25;
		});
		pdata.forEach(function(batt, i) {
			if(typeof(batt.opp) !== "undefined") {
				$('#bside').append('<div id="batt'+i+'" class="btn btn-default battler bg-'+toLower(batt.head)+'" data-exp25="'+batt.exp25+'" data-exp50="'+batt.exp50+'" data-exp75="'+batt.exp75+'" data-exp100="'+batt.exp100+'" data-opp="'+batt.opp+'" data-head="'+toLower(batt.head)+'">' +
									'<b>' + batt.opp + '</b><br>' +
									'<small>(' + batt.head + ')</small><br>' +
									'Exp: <span class="exp">' + numberWithCommas(batt.exp25) + '</span>' +
								'</div>');
			}
		});
		$('#bside').data('dataset', eset);
		
		//Run this after pdata is populated
		//load_sums loads the 'eset' set
		load_sums(function() {
			if($('#exp2target').data('num') > 0) findPossibleCombo();
		});
	});
	
	$(document).on('click', ".battler", function(e) {
		var bid = $(this).attr('id').substring(4);
		addBattleEntry( bid, $(this).data('opp'), $(this).data('exp' + eset), $(this).data('head') );
		calcTotals();
	});
	
	$(document).on('click', ".btclose .close", function(e) {
		var btitem = $(this).closest('tr.btitem');
		var battles = btitem.find('.battles').text();
		if(battles > 1) {
			battles -= 1;
			var exp = btitem.find('.exp').data('num');
			btitem.find('.battles').text( battles );
			btitem.find('.total')
				.data('num', battles * exp )
				.text( numberWithCommas(battles * exp) );
		} else {
			btitem.remove();
		}
		calcTotals();
	});

	$(document).on('click', "#clearsol", function(e) {
		$('#battletable tbody tr').remove();
		calcTotals();
	});
	
	$('#entryform input').on('change',function() {
		var currExp = checkAndFixExp( $('#currentExp').val() );
		var targExp = checkAndFixExp( $('#targetExp').val() );
		var calcExp = checkAndFixExp( $('#bttotal').data('num') );
		if( currExp == 0 || targExp == 0 ) {
			removeAlert();
			return;
		} else if( targExp < currExp ) {
			createAlert('error','Current Exp appears to be higher than Target Exp');
		} else if( currExp < 100000 || targExp < 100000 ) {
			createAlert('error','This calculator only works for pokemon that are lvl 100');
		} else if( targExp == currExp ) {
			createAlert('success','You are already at the Target Exp!');
		} else if ( targExp - currExp - calcExp < 4 && targExp - currExp - calcExp > 0 ) {
			createAlert('warning','It is not possible to obtain less than 4 exp from a battle!');
		} else {
			//Check against limits
			expsets = [ 25, 50, 75, 100 ];
			//Error Check
			error = 0;
			for(i = 0; i <= expsets.length; i++) {
				expset = expsets[i];
				if(currExp < expset*1000000 && targExp > expset*1000000) {
					createAlert('warning','Exp received is different when your Pokemon has less than ' + numberWithCommas(expset*1000000) + ' exp from when it has more.' +
											'<br>This calculator will not work in such a situation. <br>Try getting your exp above this threshold and Try Again.');
					error = 1;
					break;
				}
			}

			if(!error) {
				for(i = 0; i <= expsets.length; i++) {
					if(currExp < expsets[i]*1000000) {
						eset = expsets[i];
						load_sums();
						break;
					}
				}
				removeAlert();
				var remaining = targExp - currExp - calcExp;
				$('#exp2target').text( numberWithCommas(remaining) ).data('num',remaining);
				//console.log('exp2target updated!');
				if(!$.isEmptyObject(pdata) && !$.isEmptyObject(prepdata) && remaining >= 23)
					findPossibleCombo();
			}
		}
	});
	$('#entryform input:first-of-type').trigger('change');
	
	$('[data-toggle="tooltip"]').tooltip();
	
    //note
	$(document).on('click', "#note", function(e) {
		$('#infobox2').slideUp();									  
		$('#infobox').slideDown();
		$('#bside').css('height', '80vh');
		$("#note").html("Hide Note and Usage");	
		$('#note').attr("class","btn btn-sm btn-warning navbar-text pull-right")
		$('#note').attr("id","hide")
	});
	
	 //hidenote
	$(document).on('click', "#hide", function(e) {
		$('#infobox').slideUp();									  
		$('#infobox2').slideDown();
		$('#bside').css('height', '92vh');
		$("#hide").html("Note and Usage");	
		$('#hide').attr("class","btn btn-sm btn-info navbar-text pull-right")
		$('#hide').attr("id","note")
	});
	
	
	
	//Load Solution button
	$(document).on('click', "#loadsolution", function(e) {
		removeAlert();
		loadSolution();
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
	num = num.toString().replace(/,/g,'');
	num = Math.abs( parseInt(num,10) );
	return num;
}

function createAlert(type,message) {
	var aclass = '';
	switch(type) {
		case 'error': aclass='danger'; break;
		case 'warn':
		case 'warning': aclass='warning'; break;
		case 'success': aclass='success'; break;
		default: aclass='info'; break;
	}
	var alert = '' +
		'<div class="alert alert-' + toLower(aclass) + ' alert-dismissible fade in" role="alert">' +
			'<button class="close" aria-label="Close" data-dismiss="alert" type="button">' +
				'<span aria-hidden="true">×</span>' +
			'</button>' +
			'<strong>' + ucfirst(type) + '!</strong> ' +
			message +
		'</div>';
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
	$('#bttotal').text( numberWithCommas(total) ).data('num',total);
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
				var pieces = loadTrainers4Calc(10,100000);
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
				if(typeof(prepdata[ target ]) !== 'undefined') {
					//console.log('Found Solution for remaining: ' + prepdata[ target ]);
					solution = solution + '+' + prepdata[ target ];
					target = 0;
					strat = 0;
				} else {
					strat = 2;
				}
				break;
			case 2: //Use few trainers to reduce target until result is found in prepdata
				var pieces = loadTrainers4Calc(10,target);
				//console.log(pieces);
				if(target > pieces[ pieces.length-1 ]) {
					for(var i = 0; i < pieces.length; i++) {
						if(target >= pieces[i]) {
							var newtarg = target - pieces[i];
							if(typeof(prepdata[ newtarg ]) !== 'undefined') {
								//console.log('Found Solution for remaining for '+newtarg+': ' + prepdata[ newtarg ]);
								solution = solution + '+' + pieces[i] + '+' + prepdata[ newtarg ];
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
		createAlert('success','A solution has been calculated for this target exp.<br><br><button id="loadsolution" class="btn btn-success">Load Solution</button>');
	} else {
		console.log('No Solution');
		solvedsoluton = '';
	}
}

function loadSolution() {
	var exps = solvedsoluton.split('+').filter(Boolean);
	//console.log(exps);
	for(var i = 0; i < exps.length; i++) {
		var trainer = findTrainerByExp( exps[i] );
		//console.log(trainer);
		addBattleEntry(trainer.id, trainer.opp, trainer['exp' + eset], trainer.head);
	}
	calcTotals();
}

function loadTrainers4Calc(num,max) {
	var all_trainers = [];
	all_trainers = pdata;
	all_trainers.sort(function(a,b) {
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

function findTrainerByExp(exp) {
	var trainer = [];
	for(var i = 0; i < pdata.length; i++) {
		if(pdata[i]['exp' + eset] == exp) {
			trainer = pdata[i];
			break;
		}
	}
	trainer['id'] = $('.battler b').filter(function(i) { return $(this).text() === trainer.opp }).closest('.battler').attr('id').substring(4);
	//console.log(trainer);
	return trainer;
}

function addBattleEntry(bid, opp, exp, head) {
	if($('#bt_'+bid).length) {
		var battles = $('#bt_'+bid+' .battles').text() * 1 + 1;
		$('#bt_'+bid+' .battles').text( battles );
		$('#bt_'+bid+' .total')
			.data('num', battles * exp )
			.text( numberWithCommas(battles * exp) );
	} else {
		var html = '<tr class="btitem bg-'+toLower(head)+'" id="bt_'+bid+'">' +
						'<td class="name">' + opp + '</td>' +
						'<td class="name" style="text-align:left; font-size:12px;">' + head + '</td>' +
						'<td class="battles">1</td>' +
						'<td class="exp" data-num="' + exp + '">' + numberWithCommas(exp) + '</td>' +
						'<td class="total" data-num="' + exp + '">' + numberWithCommas(exp) + '</td>' +
						'<td class="btclose"><button class="close" type="button"><span>×</span></button></td>' +
					'</tr>';
		$('#battletable').append(html);
	}
}

function ucfirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function toLower(x) {
	/*console.log(x);*/
	if(typeof x == 'undefined') return '';
	return x.toLowerCase();
}

function load_sums(callback) {
	if(load_sums_wait) {
		setTimeout(function() { load_sums(callback); }, 2000);
		return;
	}
	if(!(eset in sumcache)) {
		load_sums_wait = 1;
		$.getJSON('data/sums_sub' + eset + '.json?v=20190919', function(data) {
			prepdata = data;
			for(var i = 0; i < pdata.length; i++) {
				if(typeof(pdata[i]['exp' + eset]) !== 'undefined') {
					prepdata[ pdata[i]['exp' + eset] ] = pdata[i]['exp' + eset];
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

function reload_exps() {
	dataset = $('#bside').data('dataset');
	if(dataset != eset) {
		$('#bside .battler').each(function () {
			newexp = $(this).data('exp' + eset);
			$(this).find('.exp').text(numberWithCommas(newexp));
		});
		$('#bside').data('dataset', eset);
	}
}

