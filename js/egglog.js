//var SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
var SCOPES = ["https://www.googleapis.com/auth/calendar"];

var month_name = new Array();
month_name[0] = "January";
month_name[1] = "February";
month_name[2] = "March";
month_name[3] = "April";
month_name[4] = "May";
month_name[5] = "June";
month_name[6] = "July";
month_name[7] = "August";
month_name[8] = "September";
month_name[9] = "October";
month_name[10] = "November";
month_name[11] = "December";

var oldest_data_time;
var newest_data_time;
var view_date = undefined;
var view_months = -2;
var chart;
var data;
var today_egg_event;
var options = {
    legend: 'none',
    width: 1000,
    height: 500,
    colors: ['#f7b825'],
    chart: {
        title: 'Egg Weights Over Time',
        subtitle: '(in grams)'
    },
    chartArea: {
        width: '75%'
    },
    hAxis: {
        title: 'Date',
        format: 'dd/M/yy',
        viewWindow: {
            min: new Date(1970, 0, 1),
            max: new Date()
        },
        gridlines: {
            count: -1
        },
    },
    vAxis: {
        title: 'Weight (grams)'
    },
    crosshair: {
        trigger: 'both'
    }
};
var egg_array = [];
/**
 * Check if current user has authorized this application.
 */
function checkAuth() {
    gapi.auth.authorize({
        'client_id': CLIENT_ID,
        'scope': SCOPES.join(' '),
        'immediate': true
    }, handleAuthResult);
}

/**
 * Handle response from authorization server.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
    var authorizeDiv = document.getElementById('authorize-div');
    if (authResult && !authResult.error) {
        // Hide auth UI, then load client library.
        authorizeDiv.style.display = 'none';
        $('div#navbuttons').show();
        $('div#toolbar').show();
        loadCalendarApi();
    } else {
        // Show auth UI, allowing the user to initiate authorization by
        // clicking authorize button.
        authorizeDiv.style.display = 'inline';
    }
}

/**
 * Initiate auth flow in response to user clicking authorize button.
 *
 * @param {Event} event Button click event.
 */
function handleAuthClick(event) {
    gapi.auth.authorize({
            client_id: CLIENT_ID,
            scope: SCOPES,
            immediate: false
        },
        handleAuthResult);
    return false;
}

/**
 * Load Google Calendar client library. List upcoming events
 * once client library is loaded.
 */
function loadCalendarApi() {
    gapi.client.load('calendar', 'v3', chartEggWeights);
}

/**
 * Print the summary and start datetime/date of the next ten events in
 * the authorized user's calendar. If no events are found an
 * appropriate message is printed.
 */
function chartEggWeights() {
    var request = gapi.client.calendar.events.list({
        'calendarId': CALENDAR_ID,
        //'timeMin': (new Date('1970-1-1')).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 25000,
        'orderBy': 'startTime'
    });

    request.execute(function(resp) {
        var events = resp.items;

        if (events.length <= 0) {
            appendPre('No Egg events found.');
            return;
        }

        egg_array = [];

        today_egg_event = undefined;
        var today = new Date();
        var today_y = today.getFullYear();
        var today_m = today.getMonth();
        var today_d = today.getDate();
        for (i = 0; i < events.length; i++) {
            var event = events[i];
            var when = event.start.dateTime;
            if (!when) {
                when = event.start.date;
            }
            //console.log('start.dateTime: ' + event.start.dateTime);
            //console.log('start.date: ' + event.start.date);
            var jdate = new Date(when);
            var year = jdate.getFullYear();
            var month = jdate.getMonth();
            var day = jdate.getDate();
            var jdate_str = year + '-' + (month + 1) + '-' + day;
            //appendPre(event.summary + ' (' + jdate_str + ') ' + event.description);
            jdate = new Date(year, month, day);
            if (event.summary === 'Egg') {
                if ((year === today_y) && (month === today_m) && (day === today_d)) {
                    today_egg_event = event;
                    //console.log('today_egg_event');
                    //console.log(today_egg_event);
                }
                var weights = weightsFromEvent(event);
                for (var j = 0; j < weights.length; ++j) {
                    egg_array.push([jdate, weights[j]]);
                }
            }
        }
        // Chart
        google.charts.load('current', {
            'packages': ['corechart', 'controls']
        });
        google.charts.setOnLoadCallback(drawChart);
    });
}

function weightsFromEvent(event) {
    var weights = [];
    var description = event.description.toLowerCase();
    if (description.startsWith('weight:')) {
        var weight_strs = description.substr('weight:'.length).trim().split(',');
        var j = 0;
        for (j = 0; j < weight_strs.length; ++j) {
            var weight = parseInt(weight_strs[j].replace('g', '').trim());
            if (weight != NaN) {
                //console.log('pushed jdate:' + jdate + ', weight:' + weight);
                weights.push(weight);
            }
        }
    }
    return weights;
}

function drawChart() {
    // Create data table
    data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Weight');

    data.addRows(egg_array);

    chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));

    var row_count = data.getNumberOfRows();
    if (row_count <= 0) {
        return;
    }
    view_date = new Date(data.getValue(row_count - 1, 0).getTime());

    oldest_data_time = data.getValue(0, 0).getTime();
    newest_data_time = view_date.getTime();

    //console.log('drawChart() - view_date: ' + view_date);
    updateView();
}

function updateView() {
    var months = parseInt(view_months);
    //console.log('updateView() - view_months: ' + view_months);
    switch (months) {
        case -2:
            {
                setLogView();
            }
            break;
        case -1:
            {
                setAllView();
            }
            break;
        case 1:
            {
                setMonthView();
            }
            break;
        case 3:
            {
                setSeasonView();
            }
            break;
        case 12:
            {
                setYearView();
            }
            break;
        default:
            break;
    }
}

/**
 * Append a pre element to the body containing the given message
 * as its text node.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
    var pre = document.getElementById('output');
    var textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
}

// -- Button events

$(document).ready(function() {
    $('button#log').on('click', setLogView);
    $('button#month').on('click', setMonthView);
    $('button#season').on('click', setSeasonView);
    $('button#year').on('click', setYearView);
    $('button#all').on('click', setAllView);
    $('button#prev').on('click', prevView);
    $('button#next').on('click', nextView);
    $('div#log_div').hide();
    $('button#submit').on('click', submitEggWeight);
});

function prevView() {
    if (view_date === undefined) {
        return;
    }
    if (view_months < 1) {
        return;
    }

    var month = view_date.getMonth();
    var view_month = month - view_months;
    if (view_month < 0) {
        view_month = 12 + view_month;
    }
    view_date.setMonth(month - view_months);

    updateView();
}

function nextView() {
    if (view_date === undefined) {
        return;
    }
    if (view_months < 1) {
        return;
    }

    var month = view_date.getMonth();
    view_date.setMonth(month + view_months);

    if (view_months === 12) {
        setYearView();
    } else if (view_months === 3) {
        setSeasonView();
    } else if (view_months === 1) {
        setMonthView();
    }
}

function disenableNavButtons() {
    var min_date = options.hAxis.viewWindow.min;
    var max_date = options.hAxis.viewWindow.max;

    $('button#prev').prop('disabled', (min_date.getTime() <= oldest_data_time));
    $('button#next').prop('disabled', (max_date.getTime() >= newest_data_time));
}

function setMonthView() {
    $('div#log_div').hide();
    $('div#chart_div').fadeIn();

    //console.log('setMonthView');
    var row_count = data.getNumberOfRows();
    if (row_count === 0) {
        return;
    }

    //var max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    if (view_date === undefined) {
        max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    } else {
        max_date = new Date(view_date.getTime());
    }

    var year = max_date.getFullYear();
    var month = max_date.getMonth();

    max_date = new Date(year, month + 1, 0);
    options.hAxis.viewWindow.min = new Date(year, month, 1);
    options.hAxis.viewWindow.max = max_date;
    options.hAxis.gridlines.count = 30;
    options.hAxis.format = 'dd';
    options.hAxis.title = 'Month View (' + month_name[month] + ' ' + year + ')';

    chart.draw(data, options);

    view_months = 1;
    disenableNavButtons();
}

function setSeasonView() {
    $('div#log_div').hide();
    $('div#chart_div').fadeIn();

    //console.log('setSeasonView');
    var row_count = data.getNumberOfRows();
    if (row_count === 0) {
        return;
    }

    //var max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    if (view_date === undefined) {
        max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    } else {
        max_date = new Date(view_date.getTime());
    }

    var year = max_date.getFullYear();
    var month = max_date.getMonth();

    var min_date;
    var max_date;
    var season;
    // Spring Sep to Nov
    if ((month >= 8) && (month <= 10)) {
        min_date = new Date(year, 8, 1);
        max_date = new Date(year, 11, 1);
        season = 'Spring';
    }
    // Summer Dec to Feb
    else if ((month >= 11) || (month <= 1)) {
        if (month >= 11) {
            min_date = new Date(year, 11, 1);
            max_date = new Date(year + 1, 2, 1);
        } else {
            min_date = new Date(year - 1, 11, 1);
            max_date = new Date(year, 2, 1);
        }
        season = 'Summer';
    }
    // Autumn Mar to May
    else if ((month >= 2) && (month <= 4)) {
        min_date = new Date(year, 2, 1);
        max_date = new Date(year, 5, 1);
        season = 'Autumn';
    }
    // Winter Jun to Aug
    else if ((month >= 5) && (month <= 7)) {
        min_date = new Date(year, 5, 1);
        max_date = new Date(year, 8, 1);
        season = 'Winter';
    }

    options.hAxis.viewWindow.min = min_date;
    options.hAxis.viewWindow.max = max_date;
    options.hAxis.gridlines.count = 4;
    options.hAxis.format = 'MMM';
    options.hAxis.title = season + ' View (' + year + ')';

    chart.draw(data, options);

    view_months = 3;
    disenableNavButtons();
}

function setYearView() {
    $('div#log_div').hide();
    $('div#chart_div').fadeIn();

    //console.log('setYearView');
    var row_count = data.getNumberOfRows();
    if (row_count === 0) {
        return;
    }

    if (view_date === undefined) {
        max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    } else {
        max_date = new Date(view_date.getTime());
    }
    var year = max_date.getFullYear();

    options.hAxis.viewWindow.min = new Date(year, 0, 1);
    options.hAxis.viewWindow.max = new Date(year + 1, 0, 1);
    options.hAxis.gridlines.count = 12;
    options.hAxis.format = 'MMM';
    options.hAxis.title = 'Year View (' + year + ')';

    chart.draw(data, options);

    view_months = 12;
    disenableNavButtons();
}

function setAllView() {
    $('div#log_div').hide();
    $('div#chart_div').fadeIn();
    //console.log('setAllView');
    var row_count = data.getNumberOfRows();
    if (row_count === 0) {
        return;
    }

    var min_date = new Date(data.getValue(0, 0).getTime());
    //var max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    var max_date;
    if (view_date === undefined) {
        max_date = new Date(data.getValue(row_count - 1, 0).getTime());
    } else {
        max_date = new Date(view_date.getTime());
    }
    min_date.setMonth(min_date.getMonth());
    min_date.setDate(1);

    max_date.setMonth(max_date.getMonth() + 1);
    max_date.setDate(1);

    options.hAxis.viewWindow.min = min_date;
    options.hAxis.viewWindow.max = max_date;
    options.hAxis.gridlines.count = -1;
    options.hAxis.format = 'MMM yy';
    options.hAxis.title = 'Everything';

    chart.draw(data, options);

    view_months = -1;
    disenableNavButtons();
}


function setLogView() {
    //console.log('setLogView');
    $('div#chart_div').hide();
    $('div#log_div').fadeIn();
    var $day_date = $('span#day_date');
    $day_date.empty();
    view_date = new Date();
    $day_date.html(view_date.toLocaleDateString());
    var $day_div = $('div#day_div');
    $day_div.empty();
    if (today_egg_event === undefined) {
        $day_div.html('No eggs so far. (today_egg_event undefined)');
        return;
    }
    var weights = weightsFromEvent(today_egg_event);
    //console.log('weights: ' + weights);
    if (weights.length < 1) {
        $day_div.html('No eggs so far. (weights length zero)');
        return;
    }
    var $egg_list = $('<ul id="egglist"></ul>').appendTo($day_div);
    for (var i = 0; i < weights.length; ++i) {
        var weight = weights[i];
        var $item = $('<li>' + weights[i] + 'g</li>');
        var $del_button = $('<i class="material-icons" weight="' + weight + '">delete</i>');
        $item.append($del_button);
        $egg_list.append($item);
    }

    $('ul#egglist i.material-icons').on('click', function() {
        var del_w = parseInt($(this).attr('weight'));
        //console.log('del_button - weight: ' + del_w);
        var ws = weightsFromEvent(today_egg_event);
        for (var j = 0; j < ws.length; ++j) {
            var w = ws[j];
            //console.log('w: ' + w);
            if (w === del_w) {
                //console.log('splice at pos: ' + j);
                ws.splice(j, 1);
                break;
            }
        }
        //console.log('ws.legnth: ' + ws.length);
        if (ws.length < 1) {
            var request = gapi.client.calendar.events.delete({
                'calendarId': CALENDAR_ID,
                'eventId': today_egg_event.id,
                'resource': today_egg_event
            });
            if (request !== undefined) {
                request.execute(function(event) {
                    //console.log('Event deleted');
                    view_months = -2;
                    chartEggWeights();
                });
            }
        } else {
            var w_str = 'Weight:';
            var wg_array = [];
            for (var j = 0; j < ws.length; ++j) {
                wg_array.push(ws[j] + 'g');
            }
            //console.log('wg_array.legnth: ' + wg_array.length);
            w_str += wg_array.join(',');
            today_egg_event.description = w_str;
            //console.log('w_str: ' + w_str);
            var request = gapi.client.calendar.events.update({
                'calendarId': CALENDAR_ID,
                'eventId': today_egg_event.id,
                'resource': today_egg_event
            });
            if (request !== undefined) {
                request.execute(function(event) {
                    //console.log('Event updated: ' + event.htmlLink);
                    view_months = -2;
                    chartEggWeights();
                });
            }
        }
    });

    view_months = -2;
    disenableNavButtons();
}

function submitEggWeight() {
    //console.log('submitEggWeight()');

    var today = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    var start_date_str = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var end_date_str = tomorrow.getFullYear() + '-' + (tomorrow.getMonth() + 1) + '-' + tomorrow.getDate();
    //console.log('submitEggWeight() + start_date_str: ' + start_date_str);
    //console.log('submitEggWeight() + end_date_str: ' + end_date_str);

    var submit_weight = $('input#weight_input').val();
    //console.log('submitEggWeight() + weight_input: ' + submit_weight);

    /*
      if (today_egg_event !== undefined) {
        today_egg_event.description = today_egg_event.description + ',' + submit_weight + 'g';
      }
    */

    //console.log('submitEggWeight()');
    //console.log(today_egg_event);

    var request;

    if (today_egg_event === undefined) {
        var event = {
            'summary': 'Egg',
            'description': 'Weight:' + submit_weight + 'g',
            'start': {
                'date': start_date_str
            },
            'end': {
                'date': end_date_str
            }
        };
        var request = gapi.client.calendar.events.insert({
            'calendarId': CALENDAR_ID,
            'resource': event
        });
        if (request !== undefined) {
            request.execute(function(event) {
                //console.log('Event created: ' + event.htmlLink);
                // Then update today's egg weights view under the submit UI
                $('input#weight_input').val('');
                view_months = -2;
                chartEggWeights();
            });
        }
    } else {
        var desc = today_egg_event.description;
        today_egg_event.description += ',' + submit_weight + 'g';
        var request = gapi.client.calendar.events.update({
            'calendarId': CALENDAR_ID,
            'eventId': today_egg_event.id,
            'resource': today_egg_event
        });
        if (request !== undefined) {
            request.execute(function(event) {
                //console.log('Event updated: ' + event.htmlLink);
                // Then update today's egg weights view under the submit UI
                $('input#weight_input').val('');
                view_months = -2;
                chartEggWeights();
            });
        }
    }

}
