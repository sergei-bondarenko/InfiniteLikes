// ==UserScript==
// @name         InfiniteLikes
// @namespace    https://github.com/grez911/InfiniteLikes
// @version      0.1
// @description  Bot for likes.fm
// @match        https://likes.fm/
// @grant        none
// ==/UserScript==

var access_token = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // токен, необходимо вставить свой
var viewer_id = viewer_profile.uid;  // это id ВК
var like = 0;          // в этих переменных хранится количество лайков, репостов, подписок, совершённых за текущий сеанс
var repost = 0;
var sub = 0;
var group = 0;

var performedOffers = [];    // двумерный массив последних 30 выполненных заданий, одной записи: ["like", "photo12345_67890"] 
for (var i = 0; i < 30; i++) performedOffers[i] = ["", ""];    //инициализируем его

function do_offers(action, offer, interval) {                     // отправляет запрос на подтверждение
  var url = "https://likes.fm/do_offers?entities%5B%5D=" + offer + "." + action + "&client_id=" + client_id + "&viewer_id=" + viewer_id;
  var method = "POST";                                            // хз, зачем этот client_id ------^ но без него ругается - (400)BAD REQUEST,
                                                                  // хотя лайки и зачисляет. эта переменная уже есть в окружении, но на самом деле
                                                                  // можно поставить любое число вместо неё и всё будет работать
  var async = true;           // вкл. асинхронную передачу (выполнение в фоне), чтобы страничка не "зависала" во сремя выполнени запроса
  var request = new XMLHttpRequest();
  request.onload = function () {
    var status = request.status;                         // полученный HTTP статус, напр., 200 для "200 OK"
    var data = request.responseText;                    // полученный ответ.
    if (data.search("checked") != -1) {
      console.log("Действие " + action + " по отношению к " + offer + " выполнено и подтверждено.");
      switch (action) {
        case "like":
          like += 1;
          break;
        case "repost":
          repost += 1;
          break;
        case "sub":
          sub += 1;
          break;
        case "group":
          group += 1;
          break;
      }
      console.log("За текущий сеанс сделано лайков: " + like + ", репостов: " + repost + ", подписок на страницы: " + sub + ", на группы: " + group + ".");
    } else {
      console.log("Что-то не так, likes.fm сообщает: " + data);
    }
    setTimeout(function(){ main(action, interval); }, interval * 1000);      // вызвать main() через interval секунд 
  }
  request.open(method, url, async);
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.send();                     // отправляем запрос
}

function do_action(action, offer, interval) {  // выполнить действие action: like/repost/sub/group над объектом offer с помощью vk api
  switch (action) {
    case "like":
      var matched = /(photo|wall|video)(-?\d*)_(\d*)/.exec(offer);    // извлекаем из предложения тип, и два id
      var type = matched[1];
      var owner_id = matched[2];
      var item_id = matched[3];
      switch (type) {
        case "photo":
          var the_url = "https://api.vk.com/method/likes.add?owner_id=" + owner_id + "&item_id=" + item_id + "&type=photo&access_token=" + access_token;
          break;
        case "wall":
          var the_url = "https://api.vk.com/method/likes.add?owner_id=" + owner_id + "&item_id=" + item_id + "&type=post&access_token=" + access_token;
          break;
        case "video":
          var the_url = "https://api.vk.com/method/likes.add?owner_id=" + owner_id + "&item_id=" + item_id + "&type=video&access_token=" + access_token;
          break;
      }
      break;
    case "repost":
      var the_url = "https://api.vk.com/method/wall.repost?object=" + offer + "&access_token=" + access_token;
      break;
    case "sub":
      var matched = /id(\d*)/.exec(offer);            // извлекаем id
      var the_url = "https://api.vk.com/method/friends.add?user_id=" + matched[1] + "&access_token=" + access_token;
      break;
    case "group":
      var matched = /club(\d*)/.exec(offer);          // извлекаем id
      var the_url = "https://api.vk.com/method/groups.join?group_id=" + matched[1] + "&access_token=" + access_token;
      break;
  }
  $.ajax({
    url: the_url,
    dataType: 'jsonp',
    type: 'get',
    success: function(data) {
      var result = JSON.stringify(data);              // ответ от сервера, преобразованный в строку
      if (result.search("captcha") != -1) {            // если требуют каптчу
        alert("Накрутка " + action + " прекращена из-за каптчи.");
        return;                                        //останавливаем накрутку данного типа
      } else {
        do_offers(action, offer, interval);            // если нет каптчи, запрашиваем подтверждение у likes.fm
      }
    }
  });
}

function isPerformed(action, offer) {                  // выполняли ли мы данное задание раньше?
  for(var i = 0; i < performedOffers.length; i++) {
    if (action == performedOffers[i][0] && offer == performedOffers[i][1]) {
      return true;
    }
  }
  return false;
}

function main(action, interval) {        //начать выполнять action (like/repost/sub/group) с интервалом interval
  switch (action) {
    case "like":
      var offers = offersList.like;
      break;
    case "repost":
      var offers = offersList.repost;
      break;
    case "sub":
      var offers = offersList.sub;
      break;
    case "group":
      var offers = offersList.group;
      break;
  }
  for (var i = 0; i < offers.length; i++) {                // для каждого предложения по лайкам проверяем, выполнили ли мы его раньше
    if (isPerformed(action, offers[i]) == false) {        // если нет,
      performedOffers.shift();                            // то сдвигаем массив выполненных заданий на единицу
      performedOffers.push([action, offers[i]]);          // дописываем в него текущее действие
      do_action(action, offers[i], interval);              // запускаем функцию, которая выполняет действие action
      return;                                              // выходим из этой функции
    }
  }
  console.log("Нет невыполненных заданий по " + action + ".");        // если не нашли ни одного невыполненного задания
  setTimeout(function(){ main(action, interval); }, interval * 1000);  // вызвать main() через interval секунд
}

$(document).ready(function() {
  main("like", 60);                                      // запускаем лайки с интервалом в 60с
  setTimeout(function(){ main("sub", 300); }, 5000);    // через 5 с запускаем подписку странички с интервалом в 180 с
  setTimeout(function(){ main("group", 300); }, 10000);  // ещё через 5 с запускаем подписку на группы с интервалом в 180 с
  setTimeout(function(){ main("repost", 60); }, 15000);  // ещё через 5 с запускаем репосты с интервалом в 60 с
});
