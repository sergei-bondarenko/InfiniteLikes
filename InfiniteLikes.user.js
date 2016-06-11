// ==UserScript==
// @name         InfiniteLikes
// @namespace    https://github.com/grez911
// @version      0.2
// @description  Bot for likes.fm
// @match        https://likes.fm/*
// @grant        none
// ==/UserScript==

var viewer_id = viewer_profile.uid;  // это id ВК
var access_token = "ххххххххххххх";  // сюда вставить токен

var max_likes = 30;         // максимально допустимое количество выполненных действий за один сеанс
var max_reposts = 15;
var max_subs = 10;
var max_groups = 10;

var like_min_wait = 180;    // минимальное время задержки между лайками в секундах
var like_max_wait = 300;    // максимальное время задержки между лайками в секундах
var repost_min_wait = 180;  // между репостами
var repost_max_wait = 900;
var sub_min_wait = 400;     // между подписками на странички
var sub_max_wait = 900; 
var group_min_wait = 180;   // между вступлениями в группы
var group_max_wait = 900;

var likes_performed = 0;    // в этих переменных хранится количество лайков, репостов, подписок, совершённых за текущий сеанс
var reposts_performed = 0;
var subs_performed = 0;
var groups_performed = 0;

var stop = false;           // если true, то выполнение заданий прекращается

var performed_offers = [Array(100).fill(""), Array(100).fill("")];  // сюда записываются последние 100 выполненных заданий
                                                                    // пример одной записи: ["like", "photo12345_67890"] 

var todo = {
  like: Array(100).fill(""),    // четыре массива с актуальными заданиями
  sub: Array(50).fill(""),
  group: Array(50).fill(""),
  repost: Array(50).fill("")
};

$(document).ready(function() {
  var interval_id = window.setInterval("", 9999);  // останавливаем все интервалы,
  for (var i = 1; i < interval_id; i++)            // чтобы подгрузку заданий выполнять самостоятельно
    window.clearInterval(i);
  updateStats();    // показываем статистику
  setTimeout(function(){ main("like"); }, 3000);     // запускаем выполнение лайков
  setTimeout(function(){ main("sub"); }, 6000);      // запускаем подписку на странички
  setTimeout(function(){ main("group"); }, 9000);    // запускаем подписку на группы
  setTimeout(function(){ main("repost"); }, 12000);  // запускаем репосты 
});

function main(action) {        // начать выполнять action (like/repost/sub/group)
  if (stop) { return; }        // если остановлено, то выходим из этой функции
  getOffers(action);           // получить свежие задания
}

function getOffers(action) {  // загружает свежие задания в todo
  var url = "https://likes.fm/get_offers?client_id=" + client_id + "&viewer_id=" + viewer_id;
  var method = "POST";
  var async = true;           // вкл. асинхронную передачу (выполнение в фоне)
  var request = new XMLHttpRequest();
  request.open(method, url, async);
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.send();                  // отправляем запрос
  request.onload = function () {
    var status = request.status;   // полученный HTTP статус, например, 200 для "200 OK"
    data = request.responseText;   // полученный ответ.
    data = JSON.parse(data);
    if (data.hasOwnProperty("sub")) {      // если получены задания по подпискам
      for (var i = 0; i < data.sub.length; i++) {
        if (isOfferGot("sub", data.sub[i].id) == false) {    // проверяем, не получали ли мы его ранее
          todo.sub.shift();                                  // сдвигаем массив выполненных заданий на единицу
          todo.sub.push(data.sub[i].id);                     // записываем в массив
        }
      }
    }
    if (data.hasOwnProperty("group")) {    // если получены задания по вступлениям в группы
      for (var i = 0; i < data.group.length; i++) {
        if (isOfferGot("group", data.group[i].id) == false) {  // проверяем, не получали ли мы его ранее
          todo.group.shift();                                  // сдвигаем массив выполненных заданий на единицу
          todo.group.push(data.group[i].id);                   // записываем в массив
        }
      }
    }
    if (data.hasOwnProperty("like")) {    // если получены задания по лайкам
      for (var i = 0; i < data.like.length; i++) {
        if (isOfferGot("like", data.like[i].id) == false) {    // проверяем, не получали ли мы его ранее
          todo.like.shift();                                   // сдвигаем массив выполненных заданий на единицу
          todo.like.push(data.like[i].id);                     // записываем в массив
        }
      }
    }
    if (data.hasOwnProperty("repost")) {  // если получены задания по лайкам
      for (var i = 0; i < data.repost.length; i++) {
        if (isOfferGot("repost", data.repost[i].id) == false) {  // проверяем, не получали ли мы его ранее
          todo.repost.shift();                                   // сдвигаем массив выполненных заданий на единицу
          todo.repost.push(data.repost[i].id);                   // записываем в массив
        }
      }
    }
    chooseOffer(action);         // выбираем, какое задание будем выполнять
  }
}

function chooseOffer(action) {   // выбирает задание из todo, которое раньше не выполняли
  var offers = [];
  switch (action) {
    case "like":
      offers = todo.like;        // актуальные задания по лайкам
      break;
    case "repost":
      offers = todo.repost;      // актуальные задания по репостам
      break;
    case "sub":
      offers = todo.sub;         // актуальные задания по подпискам
      break;
    case "group":
      offers = todo.group;       // актуальные задания по вступлениям в группы
      break;
  }
  for (var i = 0; i < offers.length; i++) {                // для каждого предложения по лайкам
    if (isOfferPerformed(action, offers[i]) == false) {    // проверяем, выполнили ли мы его раньше
      performed_offers.shift();                            // если нет, то сдвигаем массив выполненных заданий на единицу
      performed_offers.push([action, offers[i]]);          // дописываем в него выбранное предложение
      doOffer(action, offers[i]);                          // запускаем функцию, которая его выполняет
      return;                                              // выходим из этой функции
    }
  }
  console.log(getCurrentTime() + " >> Нет невыполненных заданий по " + action + ".");    // если не нашли ни одного невыполненного задания
  setTimeout(function(){ 
    main(action); 
  }, getRandomTime(action) * 1000);  // вызвать main() через случайное время 
}

function doOffer(action, offer) {    // выполняет задание offer в ВК
  var url = "https://api.vk.com/method/";
  switch (action) {
    case "like":    // если нужно лайкнуть
      var matched = /(photo|wall|video)(-?\d*)_(\d*)/.exec(offer);    // извлекаем из предложения тип, и два id
      var type = matched[1];
      var owner_id = matched[2];
      var item_id = matched[3];
      url += "likes.add?owner_id=" + owner_id + "&item_id=" + item_id + "&type=";
      switch (type) {
        case "photo":
          url += "photo&access_token=" + access_token;
          break;
        case "wall":
          url += "post&access_token=" + access_token;
          break;
        case "video":
          url += "video&access_token=" + access_token;
          break;
      }
      break;
    case "repost":  // если нужно репостнуть
      url += "wall.repost?object=" + offer + "&access_token=" + access_token;
      break;
    case "sub":     // если нужно подписаться на страницу
      var matched = /id(\d*)/.exec(offer);      // извлекаем id
      url += "friends.add?user_id=" + matched[1] + "&access_token=" + access_token;
      break;
    case "group":   // если нужно вступить в группу
      var matched = /club(\d*)/.exec(offer);    // извлекаем id
      url += "groups.join?group_id=" + matched[1] + "&access_token=" + access_token;
      break;
  }
  $.ajax({          // отправляем запрос к ВК
    url: url,
    dataType: 'jsonp',
    type: 'get',
    success: function(data) {
      var result = JSON.stringify(data);      // ответ от сервера, преобразованный в строку
      if (result.search("captcha") != -1) {   // если требуют каптчу
        console.log(getCurrentTime() + " >> На действие " + action + " по отношению к " + offer + " поймали каптчу. Пропущено.");
        setTimeout(function(){ 
          main(action); 
        }, getRandomTime(action) * 1000);     // продолжить выполнение заданий через случайное время
      } else {
        confirmOffer(action, offer);          // если нет каптчи, запрашиваем подтверждение у likes.fm
      }
    }
  });
}

function confirmOffer(action, offer) {        // отправляет запрос на подтверждение
  var url = "https://likes.fm/do_offers?entities%5B%5D=" + offer + "." + 
            action + "&client_id=" + client_id + "&viewer_id=" + viewer_id;
  var method = "POST";
  var async = true;                     // вкл. асинхронную передачу (выполнение в фоне)
  var request = new XMLHttpRequest();
  request.open(method, url, async);
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.send();                       // отправляем запрос
  request.onload = function () {
    var status = request.status;        // полученный HTTP статус, напр., 200 для "200 OK"
    var data = request.responseText;    // полученный ответ.
    if (data.search("checked") != -1) { // если одобрено
      switch (action) {
        case "like":
          likes_performed += 1;         // увеличиваем счётчики выполненных заданий
          break;
        case "repost":
          reposts_performed += 1;
          break;
        case "sub":
          subs_performed += 1;
          break;
        case "group":
          groups_performed += 1;
          break;
      }
      console.log(getCurrentTime() + " >> Действие " + action + " по отношению к " + offer + " выполнено и подтверждено.");
      console.log("За текущий сеанс сделано лайков: " + likes_performed + ", репостов: " + reposts_performed + 
                  ", подписок на страницы: " + subs_performed + ", на группы: " + groups_performed + ".");
      updateStats();  // обновляем статистику
    } else {          // если в ответе от likes.fm нет слова "checked"
      console.log(getCurrentTime() + "  >> Что-то не так, likes.fm сообщает: " + data);
    }
    switch (action) {
      case "like":    // если выполнено больше, чем допустимо, то выходим из функции
        if (likes_performed >= max_likes) { 
          console.log(getCurrentTime() + 
                      " >> Выполнено максимальное количество лайков: " + max_likes + " штук. Остановлено.");
          return; 
        }
        break;
      case "repost":
        if (reposts_performed >= max_reposts) { 
          console.log(getCurrentTime() + 
                      " >> Выполнено максимальное количество репостов: " + max_reposts + " штук. Остановлено.");
          return; 
        }
        break;
      case "sub":
        if (subs_performed >= max_subs) { 
          console.log(getCurrentTime() + 
                      " >> Выполнено максимальное количество подписок на странички: " + max_subs + " штук. Остановлено.");
          return; 
        }
        break;
      case "group":
        if (groups_performed >= max_groups) { 
          console.log(getCurrentTime() + 
                      " >> Выполнено максимальное количество вступлений в группы: " + max_groups + " штук. Остановлено.");
          return; 
        }
        break;
    }
    // если лимит не превышен:
    setTimeout(function(){ 
      main(action); 
    }, getRandomTime(action) * 1000);      // вызвать main() через случайное время 
  }
}

/////////////// Вспомогательные функции ///////////////

function padLeft(nr, n){  // выравнивает строку nr слева до n символов нулями 
  // например:
  // padLeft("23", 5) = "00023"
  // padLeft("5", 2) = "05"
  return Array(n - String(nr).length + 1).join("0") + nr;
}

function getRandomTime(action) {  // получить рандомное время (в секундах),
  switch (action) {               // которое нужно ждать до следующего действия типа action
    case "like":
      // возвращает случайное целое число в диапазоне от like_min_wait до like_max_wait включительно:
      return Math.floor((Math.random() * like_max_wait) + like_min_wait);
    case "repost":
      return Math.floor((Math.random() * repost_max_wait) + repost_min_wait);
    case "sub":
      return Math.floor((Math.random() * sub_max_wait) + sub_min_wait);
    case "group":
      return Math.floor((Math.random() * group_max_wait) + group_min_wait);
  }
}

function getCurrentTime() {     // возвращает текущее время, например: "21:06:24"
  var date = new Date();
  var h = date.getHours();
  var m = date.getMinutes();
  var s = date.getSeconds();
  return padLeft(h, 2) + ":" + padLeft(m, 2) + ":" + padLeft(s, 2);
}

function isOfferPerformed(action, offer) {    // выполняли ли мы данное задание раньше?
  if (offer == "") {
    return true;
  }
  for(var i = 0; i < performed_offers.length; i++) {
    if (action == performed_offers[i][0] && offer == performed_offers[i][1]) {
      return true;
    }
  }
  return false;
}

function isOfferGot(action, offer) {  // получали ли мы это задание раньше?
  switch (action) {
    case "like":
      for(var i = 0; i < todo.like.length; i++) {
        if (offer == todo.like[i]) {
          return true;
        }
      }
      break;
    case "repost":
      for(var i = 0; i < todo.repost.length; i++) {
        if (offer == todo.repost[i]) {
          return true;
        }
      }
      break;
    case "sub":
      for(var i = 0; i < todo.sub.length; i++) {
        if (offer == todo.sub[i]) {
          return true;
        }
      }
      break;
    case "group":
      for(var i = 0; i < todo.group.length; i++) {
        if (offer == todo.group[i]) {
          return true;
        }
      }
      break;
  }
  return false;
}

function updateStats() {    // обновляет статистику
  if (stop) { return; }     // если остановлено, то ничего не делаем
  if ( $(".infinite_likes").length == 0 ) {  // если не существует
    $(".profile_menu").append('<div class="infinite_likes" style="color: #2b587a"></div>');
  }
  $(".infinite_likes").html('<b>За сеанс сделано:</b><br>' +
                            'Лайков: ' + likes_performed + '<br>' +
                            'Репостов: ' + reposts_performed + '<br>' +
                            'Подписок: ' + subs_performed + '<br>' +
                            'Вступлений: ' + groups_performed + '<br><br>' +
                            '<button class="stop">Остановить</button>');
  $(".stop").on("click", stopScript);   // привязываем действие к кнопке
  $.ajax({  // обноляем баланс
    url: "/get_state",
    global: false,
    success: function(data) {
      processPrepaid(data);
    }
  })
}

function stopScript() {    // останавливает выполнение заданий
  stop = true;
  $(".stop").remove();
  $(".infinite_likes").append("Скрипт остановлен. Нажмите F5,<br>чтобы запустить заново.");
}
