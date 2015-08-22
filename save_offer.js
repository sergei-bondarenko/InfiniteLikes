var viewer_id = viewer_profile.uid;  // это id ВК
function save_offers(action, entity, num, interval) {    // заказать action над entity в количестве num с интервалом interval
  var url = "https://likes.fm/save_offer?entity=" + entity + "&type=" + action + "&num=" + num + "&client_id=" + client_id + "&viewer_id=" + viewer_id;
  var method = "POST";
  var async = true;           // вкл. асинхронную передачу (выполнение в фоне), чтобы страничка не "зависала" во сремя выполнени запроса
  var request = new XMLHttpRequest();
  request.onload = function () {
    var status = request.status;           // полученный HTTP статус, напр., 200 для "200 OK"
    var data = request.responseText;       // полученный ответ.
    if (data.search("prepaid") != -1) {
      console.log("Действие " + action + " по отношению к " + entity + " заказано.");
    } else {
      console.log("Что-то не так, likes.fm сообщает: " + data);
      return;  // прекращаем выполнение
    }
    setTimeout(function(){ save_offers(action, entity, num, interval); }, interval * 1000);      // вызвать эту же функцию через interval секунд 
  }
  request.open(method, url, async);
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.send();                     // отправляем запрос
}
// примеры вызова функций:
// save_offers("like", "photo12345_67890", 4, 180);
// save_offers("repost", "photo12345_67890", 3, 180);
// save_offers("sub", "id123456", 2, 180);
