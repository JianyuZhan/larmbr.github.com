// 回到顶部
$(document).ready(function() {
    //1.首先将#goTopBtn隐藏
    $("#scrollTop").hide();
    
    //2.给窗口添加事件：滚动时触发
    $(window).scroll(function() {
        //当滚动条的位置处于距顶部0像素以上时，返回顶部按钮出现，否则消失
        if ($(window).scrollTop() > 0) {
    	$("#scrollTop").fadeIn(1500);
        }
        else{
            $("#scrollTop").fadeOut(1500);
        }  
    });
    
    //3.当点击返回顶部按钮后，回到页面顶部位置
    $("#scrollTop").click(function() {
        $('body,html').animate({scrollTop:0},1000);
    });
});
