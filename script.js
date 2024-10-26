var redirect_uri="http://localhost:5500/index.html"

var client_id="";
var client_secret="";
var access_token = null;
var refresh_token=null;

const artistsUsed= new Map();
const relatedArtists=new Set();

const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
const SONGS = "https://api.spotify.com/v1/tracks";
const ARTISTS = "https://api.spotify.com/v1/artists/";
const SEARCH = "https://api.spotify.com/v1/search/";

function onPageLoad(){
    client_id=localStorage.getItem("client_id");
    client_secret=localStorage.getItem("client_secret");

    if(window.location.search.length > 0){
        handleRedirect();
    }
    else{
        access_token=localStorage.getItem("access_token");
        if(access_token==null){
            document.getElementById("login").style.display='block';
        }
        else{
            document.getElementById("game").style.display='block';
        }
    }
}

function handleRedirect(){
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("","",redirect_uri);
}

function fetchAccessToken(code){
    let body = "grant_type=authorization_code";
    body+="&code="+code;
    body+="&redirect_uri="+encodeURI(redirect_uri);
    body+="&client_id="+client_id;
    body+="&client_secret="+client_secret;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body){
    let xhr = new XMLHttpRequest();
    xhr.open("POST",TOKEN,true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id+":"+client_secret));
    xhr.send(body);
    xhr.onload=handleAuthorizationResponse;
}

function handleAuthorizationResponse(){
    if ( this.status == 200 ){
        var data = JSON.parse(this.responseText);
        console.log(data);
        var data = JSON.parse(this.responseText);
        if ( data.access_token != undefined ){
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if ( data.refresh_token  != undefined ){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

//function findArtist(){
    //console.log(ARTISTS+document.getElementById("artistId").value);
    //callApi("GET",ARTISTS+document.getElementById("artistId").value,null,handleArtistResponse);
//}

function findArtist(id){
    callApi("GET",ARTISTS+id,null,handleArtistResponse);
}

function submitArtist(){
    if(event.key=='Enter'){
        if(document.getElementById("artist-input").value!=""){
            callApi("GET",SEARCH+"?q="+document.getElementById("artist-input").value+"&type=artist",
            null,handleSubmitResponse);
        } 
    }
}

function handleSubmitResponse(){
    if(this.status==200){
        
        var data = JSON.parse(this.responseText);
        let key=data.artists.items[0].name;
        if(artistsUsed.get(key)==null){
            artistsUsed.set(key,1);
        } 
        else {
            artistsUsed.set(key,artistsUsed.get(key)+1);
        }
        if (artistsUsed.get(key)>=4){
            document.getElementById("warning").textContent="You can't use that artist anymore!";
            artistsUsed.set(key,3);
        } 
        else if (!relatedArtists.has(key)&&relatedArtists.size>0) {
            document.getElementById("warning").textContent="That artist does not connect!";
            artistsUsed.set(key,artistsUsed.get(key)-1);
            if(artistsUsed.get(key)<1)
                artistsUsed.delete(key);
        } 
        else {
            document.getElementById("warning").textContent=" ";
            let arr=Array.from(artistsUsed,([name,value])=>({name,value}));
            console.log(arr[0].name);
            let list=document.getElementById("usedList");
            removeAllItems("usedList");
            for(i=0;i<arr.length;i++){
                let li=document.createElement('li');
                li.innerText=arr[i].name;
                switch(arr[i].value){
                    case 1:
                        li.innerText+=" X . .";
                        break;
                    case 2:
                        li.innerText+=" X X .";
                        break;
                    case 3:
                        li.innerText+=" X X X";
                        break;
                }
                list.appendChild(li);
            }
            
            console.log(artistsUsed.get(key));
            //if(artistsUsed.get(key)==null)
            callApi("GET",ARTISTS+data.artists.items[0].id+"/related-artists",null,handleRelatedArtistsResponse);
        }
    }
    else if (this.status==401){
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function handleRelatedArtistsResponse(){
    if(this.status==200){
        var data = JSON.parse(this.responseText);
        let list=document.getElementById("relatedList");
        removeAllItems("relatedList");
        relatedArtists.clear();
        for(i = 0;i<data.artists.length;i++){
            let li=document.createElement('li');
            li.innerText=data.artists[i].name;
            relatedArtists.add(data.artists[i].name);
            list.appendChild(li);
        }
        console.log(relatedArtists);
        
    }
    else if (this.status==401){
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function searchArtists(){
    if(document.getElementById("artist-input").value!=""){
        callApi("GET",SEARCH+"?q="+document.getElementById("artist-input").value+"&type=artist",null,handleSearchResponse);
    } 
}

function handleSearchResponse(){
    if(this.status==200){
        var data = JSON.parse(this.responseText);
        let list=document.getElementById("artistList");
        removeAllItems("artistList");
        for(i = 0; i < data.artists.items.length; i++){
            let li=document.createElement('li');
            li.innerText=data.artists.items[i].name;
            list.appendChild(li);
        }
        //findArtist(data.artists.items[0].id);

    }
    else if (this.status==401){
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function handleArtistResponse(){
    if(this.status==200){
        var data = JSON.parse(this.responseText);        
        document.getElementById("artistPic").src=data.images[0].url;
    }
    else if (this.status==401){
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


function callApi(method, url, body, callback){
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}

function getCode(){
    let code = null;
    const queryString = window.location.search
    if(queryString.length>0){
        const urlParams=new URLSearchParams(queryString);
        code = urlParams.get("code");
    }
    return code;
}

function requestAuth(){
    client_id = document.getElementById("clientId").value;
    client_secret = document.getElementById("clientSecret").value;
    localStorage.setItem("client_id",client_id);
    localStorage.setItem("client_secret",client_secret);

    let url = AUTHORIZE;
    url+="?client_id="+client_id;
    url+="&response_type=code";
    url+="&redirect_uri="+encodeURI(redirect_uri);
    url+="&show_dialog=true";
    url+="&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private"
    window.location.href=url;
}

function removeAllItems( elementId ){
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}