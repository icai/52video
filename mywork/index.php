<?php 
// 定义内核目录
@date_default_timezone_set('PRC');

//脚本开始时间
$GLOBALS['_startTime'] = microtime(true);
require 'define_Path.php'; //载入路径优化
require __ROOTDIR__ . '/inc/config.php';
define('CP_PATH', __ROOTDIR__ . '/system/');
require CP_PATH . 'core/cpApp.class.php'; 

//处理多语言
$lang=$config['LANG_DEFAULT'];
if($config['LANG_OPEN']){
	$lang_file=scandir($config['LANG_PACK_PATH']);
	$url=$_SERVER['REQUEST_URI'];
	foreach ($lang_file as $value) {
		$url=strtolower($url);
		if(strstr($url,'/'.$value)){
			$lang=$value;
			$url = preg_replace('`/'.$value.'`', '', $url,1);
			break;
		}
	}
	$_SERVER['REQUEST_URI']=$url;
}
define('__LANG__', $lang);

if($config['URL_REWRITE_ON']){
define('ROOTAPP', $root);
}else{
define('ROOTAPP', $root.'/index.php'); //根应用
}
define('__TPLDIR__', __ROOTDIR__.'/'.$config['TPL_TEMPLATE_PATH']); //根模板目录
define('__TPLURL__', __ROOTURL__.'/'.$config['TPL_TEMPLATE_PATH']); //根模板目录

$config['DB_CACHE_ON'] = false; 
$config['HTML_CACHE_ON'] = false;
$config['URL_REWRITE_ON'] = false;
$config['TPL_TEMPLATE_PATH'] = 'template/';
$config['TPL_TEMPLATE_SUFFIX'] = '.html';
$config['TPL_CACHE_ON'] = false;
$config['URL_MODULE_DEPR']='/';//模块分隔符，一般不需要修改
$config['URL_ACTION_DEPR']='/';//操作分隔符，一般不需要修改
$config['URL_PARAM_DEPR']='-';//参数分隔符，一般不需要修改
$config['URL_HTML_SUFFIX']='.html';//伪静态后缀设置
$config['LANG_OPEN']=false;
$config['LANG_PACK_PATH']=__ROOTDIR__.'/lang/';//语言包目录

$app = new cpApp($config); //实例化单一入口应用控制类
// 执行项目
$app->run();
?>