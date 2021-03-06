<?php
//公共类
class commonModel
{
    protected $model = NULL; //数据库模型
    protected $config = array();
    private $_data = array();
    protected function init(){}
    
    public function __construct(){
        global $config;
        session_start();
        $config['PLUGIN_PATH']=__ROOTDIR__.'/plugins/';
        $this->config = $config;
        $this->model = self::initModel( $this->config);
        $this->cache = self::initCache( $this->config);
        $this->init();
        Plugin::init('User',$config);
		
    }


    //初始化缓存
    static public function initCache($config){
        static $cache = NULL;
        if( empty($cache) ){
            $cache = new cpCache($config);
        }
        return $cache;
    }

    //初始化模型
    static public function initModel($config){
        static $model = NULL;
        if( empty($model) ){
            $model = new cpModel($config);
        }
        return $model;
    }

    public function __get($name){
        return isset( $this->_data[$name] ) ? $this->_data[$name] : NULL;
    }

    public function __set($name, $value){
        $this->_data[$name] = $value;
    }

    //插件接口
    public function plus_hook($module,$action,$data=NULL,$return=false)
    {
        $action_name='hook_'.$module.'_'.$action;
        $list=$this->model->table('plugin')->where('status=1')->select();
        $plugin_list=Plugin::get();
        if(!empty($list)){
            foreach ($list as $value) {
                $action_array=$plugin_list[$value['file']];
                if(!empty($action_array)){
                    if(in_array($action_name,$action_array))
                    {
                        if($return){
                            return Plugin::run($value['file'],$action_name,$data,$return);
                        }else{
                            Plugin::run($value['file'],$action_name,$data);
                        }
                    }
                }
            }
        }
    }

    //替换插件接口
    public function plus_hook_replace($module,$action,$data=NULL)
    {
        $hook_replace=$this->plus_hook($module,$action,$data,true);
        if(!empty($hook_replace)){
            return $hook_replace;
        }else{
            return $data;
        }
    }

    //提示
    public function msg($message,$status=1) {
        echo json_encode(array('status' => $status, 'message' => $message));
        exit;
    }
public function addvisit(){
		
		
		if($_SESSION['uid']){
		$module=$_POST['module'];
		$action=$_POST['action'];
		$aid=intval($_POST['aid']);
		$cid=intval($_POST['cid']);
		$uid=$_SESSION['uid'];
		$fuid=intval($_POST['fuid']);
		$dateline=time();
		$ip=get_client_ip();
		$iparray=json_decode(file_get_contents('http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=json&ip='.$ip),true);
		$data=$where=array(
				'module'=>$module,
				'action'=>$action,
				'uid'=>$uid,
				'cid'=>$cid,
				'fuid'=>$fuid,
				'ip'=>$ip,
				'city'=>$iparray['city']
				);
	
		if($aid){
			$data['aid']=$where['aid']=$aid;
			}
		if(MOBILE){
			$data['from']=$where['from']='mobile';
			}else{
				$data['from']=$where['from']='pc';
				}
			$where['endtime']=array('>',($dateline-300));
		
			$visit=$this->model->table('visit')->where($where)->find();
		
			if($visit){
				$this->model->table('visit')->where(array('id'=>$visit['id']))->data(array('endtime'=>$dateline))->update();
				}else{
				$data['starttime']=$dateline;
				$data['endtime']=$dateline;
				$this->model->table('visit')->data($data)->insert();
					}
			
			}
		
		return true;
		
		
		}
		
		

}