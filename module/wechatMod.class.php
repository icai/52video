<?php
//评论管理
class wechatMod extends commonMod {
	public $token;

	public function __construct()
    {
        parent::__construct();
		$uid=$_SESSION[$this->config['SPOT'].'_user'];
		$wxuser=$this->model->table('admin')->where(array('id'=>$uid))->find();
		if(!$wxuser['token']){
			$chars='abcdefghijklmnopqrstuvwxyz';
			$len=strlen($chars);
			$randStr='';
			for ($i=0;$i<6;$i++){
				$randStr.=$chars[rand(0,$len-1)];
			}
			$this->token=$randStr.time();
			$this->model->table('admin')->data(array('token'=>$this->token))->where(array('id'=>$uid))->update();
			}else{
				
			$this->token=$wxuser['token'];
				
				}
		
		$this->assign('token',$this->token);
    }

	 //评论列表
    public function wechat_info()
    {	$uid=$_SESSION[$this->config['SPOT'].'_user'];
		
		
		$wechat_info=model('wechat')->wechat_info('wxuser',$uid);//微信信息
		$token=$this->token;
		$this->assign('token',$token);
		$this->assign('info',$wechat_info);
		
	
		/*if($_POST){
			$_POST['uid']=$_SESSION[$this->config['SPOT'].'_user'];
			$add=model('wechat')->save($_POST);
			$this->msg('保存成功！',1);
			}*/
		
			
		 $this->display();
    }
	
	//自动回复  
	public function set_reply(){
		
		$uid=$_SESSION[$this->config['SPOT'].'_user'];
		$token=$this->token;
		
		$info=model('wechat')->wechat_info('areply',$uid);//微信信息
		$this->assign('token',$token);
		$this->assign('info',$info);
		
		
		$this->display();
		
		
		
		
		}
	public function save_reply(){
		
		$_POST['uid']=intval($_SESSION[$this->config['SPOT'].'_user']);
		$_POST['token']=$this->token;
		if(!$_POST['home']) $_POST['home']=0;
		$add=model('wechat')->save('areply',$_POST);
		
		if($add!=='FALSE'){
			$this->msg('保存成功！',1);
		}else{
			
			$this->msg('保存失败,稍后再试',0);
			}
		
		
		}	
	
	
	
	public function wechat_info_add(){
		
		$_POST['uid']=intval($_SESSION[$this->config['SPOT'].'_user']);
		$_POST['token']=$this->token;
		$add=model('wechat')->save('wxuser',$_POST);
		
		$this->msg('保存成功！',1);
		
		}
		//文本回复列表
	public function text(){
		
		$token=$this->token;	
		
		$list=model('wechat')->info_list('text',$token);
		
		$this->assign('list',$list);
		
		$this->display();
		
		
		}
		//文本回复编辑页面
	public function text_edit(){
		
		if(isset($_GET['id'])){
			$id=intval($_GET['id']);
			$text_info=model('wechat')->re_info('text',$id);
			$this->assign('info',$text_info);
			
			}
		
		$this->display();
		}	
		//ajax 文本回复保存
	public function text_edit_save(){
		
		$_POST['uid']=intval($_SESSION[$this->config['SPOT'].'_user']);
		$_POST['token']=$this->token;
		
		if($_POST['id']){
			$_POST['updatatime']=time();
			$add=model('wechat')->info_save('text',$_POST);
		}else{
			$_POST['createtime']=time();
			$add=model('wechat')->insert('text',$_POST);
			}
		if($add){
			$this->msg('保存成功！',1);
		}
		
		}
		
		public function img(){
		
		$token=$this->token;	
		
		$list=model('wechat')->info_list('img',$token);
		
		$this->assign('list',$list);
		
		$this->display();
		
		
		}
		//文本回复编辑页面
	public function img_edit(){
		
		if(isset($_GET['id'])){
			$id=intval($_GET['id']);
			$text_info=model('wechat')->re_info('img',$id);
			$this->assign('info',$text_info);
			
			}
		
		$this->display();
		}	
		//ajax 文本回复保存
	public function img_edit_save(){
		
		$_POST['uid']=intval($_SESSION[$this->config['SPOT'].'_user']);
		$_POST['token']=$this->token;
		
		if($_POST['id']){
			$_POST['updatatime']=time();
			$add=model('wechat')->info_save('img',$_POST);
		}else{
			$_POST['createtime']=time();
			$add=model('wechat')->insert('img',$_POST);
			}
		if($add){
			$this->msg('保存成功！',1);
		}
		
		}
	//菜单	
	public function menu(){
		
		
		$class=model('wechat')->get_p_menu();//dump($class);
		if($class){
			foreach($class as $key=>$vo){
				$c=model('wechat')->get_c_menu($vo['id']);
				$class[$key]['class']=$c;
			}
			$this->assign('class',$class);
		}
		$this->display();
		}
	//编辑菜单	
	public function menu_add(){
		
		$p_menu=model('wechat')->get_p_menu();
		$this->assign('p_menu',$p_menu);
		$id=intval($_GET['id']);
		if($id){
			$menu_info=$this->model->table('diymen_class')->where(array('id'=>$id))->find();
			$this->assign('info',$menu_info);
			
			}
		
		$this->display();
		}	
	//菜单保存
	public function menu_save(){
		
		$_POST['uid']=intval($_SESSION[$this->config['SPOT'].'_user']);
		$_POST['token']=$this->token;
		
		if($_POST['id']){
			
			$add=model('wechat')->info_save('diymen_class',$_POST);
		}else{
			
			$add=model('wechat')->insert('diymen_class',$_POST);
			}
		if($add){
			$this->msg('保存成功！',1);
		}
		
		}	
	//菜单删除
	public function del(){
		$table='diymen_class';
		$where['id']=$_POST['id'];
		
		
		model('wechat')->del($table,$where);
		$this->msg('删除成功',1);
		}	
		
		
	//关联文章页面
	public function menu_add_content(){
		if(!$_GET['id']){
			$thiscate=$this->model->table('category')->where(array('show'=>1))->find();
			$id=$thiscate['cid'];
		}else{
			$id=intval($_GET['id']);
		}
		$this->assign('cateid',$id);
		//所有栏目信息
		
		$cate=$this->model->table('category')->where(array('show'=>1))->select();
		
		$this->assign('cate',$cate);
        $this->alert_str($id,'int');
        //获取公共信息条件
        $where=$this->common_list_where();
        $this->view()->assign($this->common_list());
        //栏目信息
        $this->class_info = model('category')->info($id);
        //分页信息
        $listRows=20;
        $url = __URL__ . '/index/id-' . $id . '-page-{page}'.$where['url'].'.html'; //分页基准网址
        $limit=$this->pagelimit($url,$listRows);
        //内容列表
        $this->list=model('live')->content_list($id,$limit,$where['where'],$where['order']);
		
        $count=model('live')->count($id,$where['where']);
        $this->page=$this->page($url, $count, $listRows);
        $this->show();
		
		
		}
		
		public function menu_add_content_list(){
		if(!$_GET['id']){
			$thiscate=$this->model->table('category')->where(array('show'=>1))->find();
			$id=$thiscate['cid'];
		}else{
			$id=intval($_GET['id']);
		}
		$this->assign('cateid',$id);
		//所有栏目信息
		
		$cate=$this->model->table('category')->where(array('show'=>1))->select();
		
		$this->assign('cate',$cate);
        $this->alert_str($id,'int');
        //获取公共信息条件
        $where=$this->common_list_where();
        $this->view()->assign($this->common_list());
        //栏目信息
        $this->class_info = model('category')->info($id);
        //分页信息
        $listRows=20;
        $url = __URL__ . '/index/id-' . $id . '-page-{page}'.$where['url'].'.html'; //分页基准网址
        $limit=$this->pagelimit($url,$listRows);
        //内容列表
        $this->list=model('live')->content_list($id,$limit,$where['where'],$where['order']);
		
        $count=model('live')->count($id,$where['where']);
        $this->page=$this->page($url, $count, $listRows);
        $this->show();
		
		
		}
		
		
		
	//公共列表信息
    public function common_list_where()
    {
        //排序
        $sequence=intval($_GET['sequence']);
        switch ($sequence) {
            case '1':
                $order='A.updatetime DESC';
                $where_url='1';
                break;
            case '2':
                $order='A.updatetime ASC';
                $where_url='2';
                break;
            case '3':
                $order='A.aid DESC';
                $where_url='3';
                break;
            case '4':
                $order='A.aid ASC';
                $where_url='4';
                break;
            case '5':
                $order='A.inputtime DESC';
                $where_url='5';
                break;
            case '6':
                $order='A.inputtime ASC';
                $where_url='6';
                break;
            case '7':
                $order='A.views DESC';
                $where_url='7';
                break;
            case '8':
                $order='A.views ASC';
                $where_url='8';
                break;
        }
        if(!empty($order)){
        $order=$order.',';
        $where_url='-sequence-'.$where_url;
        }

        //状态
        $status=intval($_GET['status']);
        switch ($status) {
            case '1':
                $where=' AND A.status=1';
                $where_url='1';
                break;
            case '2':
                $where=' AND A.status=0';
                $where_url='2';
                break;
        }
        if(!empty($status)){
        $where_url='-status-'.$where_url;
        }

        //搜索
        $search=in(urldecode($_GET['search']));
        if(!is_utf8($search)){
            $search=auto_charset($search);
        }
        if(!empty($search)){
        $where=' AND A.title like "%' . $search . '%"';
        $where_url='-search-'.urlencode($search);
        }

        //推荐位
        $position=intval($_GET['position']);
        if(!empty($position)){
            $where=' AND D.pid='.$position;
            $where_url='-position-'.$position;
        }
        return array(
            'order'=>$order,
            'where'=>$where,
            'url'=>$where_url
            );

    }
    public function common_list()
    {
        $position_list=model('position')->position_list();
        $category_list=model('category')->category_list();
        $model_info=module('live_category')->get_model();
        $data['position_list']=$position_list;
        $data['category_list']=$category_list;
        $data['model_info']=$model_info;
        //权限部分
        if(model('user_group')->model_power('live','past')){
            $data['past_power']=true;
        }
        if(model('user_group')->model_power('live','cancel')){
            $data['cancel_power']=true;
        }
        if(model('user_group')->model_power('live','del')){
            $data['del_power']=true;
        }
        if(model('user_group')->model_power('live','edit')){
            $data['edit_power']=true;
        }
        return $data;
    }

    //公共调用信息
    public function common_info($id,$status=false)
    {
        if($status){
            $info=model('live')->info($id);
            $info_data=model('live')->info_content($id);
            $position_array=model('position')->relation_array($id);
            $file_id=model('upload')->get_relation('content',$id);
            $cid=$info['cid'];
            $action_name='编辑';
            $action='edit';
        }else{
            $cid=$id;
            $action_name='添加';
            $action='add';
        }
        $class_info = model('category')->info($cid);
        $category_list=model('category')->category_list();
        $subject=model('diyfield')->field_list(2);
		$grade=model('diyfield')->field_list(1);
		$teacher=model('teacher')->model_list();
        $channel = model('channel')->model_list();
		
        $position_list=model('position')->position_list();
        $tpl_list=model('category')->tpl_list();

        $data['info']=$info;
        $data['info_data']=$info_data;
        $data['position_array']=$position_array;
        $data['file_id']=$file_id;
        $data['action_name']=$action_name;
        $data['action']=$action;
        $data['class_info']=$class_info;
        $data['category_list']=$category_list;
        $data['subject']=$subject;
		$data['grade']=$grade;
		$data['teacher']=$teacher;
        $data['channel']=$channel;
        $data['position_list']=$position_list;
        $data['tpl_list']=$tpl_list;

        return $data;
    }

    //公共保存检测信息
    public function common_data_check($data)
    {
        model('expand_model')->content_check($data);
    }


    //获取关键词
    public function get_keyword(){
        
        $title=$_POST['title'];
        $content=$_POST['live'];
        $keyword=model('live')->get_keyword($title,$content);
        if(!empty($keyword)){
            $this->msg($keyword);
        }else{
            $this->msg('暂时无法获取到关键词！',0);
        }
    }

    
		
	
	public function  menu_send(){
		if(IS_GET){
			//dump($api);
			
			
			$wxuser=$this->model->table('wxuser')->where(array('token'=>$this->token))->find();
			
			$url_get='https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid='.$wxuser['appid'].'&secret='.$wxuser['appsecret'];
			$json=json_decode($this->curlGet($url_get));
			if (!$json->errmsg){
				//return array('rt'=>true,'errorno'=>0);
			}else {
				$this->msg('获取access_token发生错误：错误代码'.$json->errcode.',微信返回错误信息：'.$json->errmsg,0);
			}


			$data = '{"button":[';

			$class=$this->model->table('diymen_class')->where(array('token'=>$this->token,'pid'=>0))->limit(3)->order('sort desc')->select();//dump($class);
			$kcount=$this->model->table('diymen_class')->where(array('token'=>$this->token,'pid'=>0))->limit(3)->order('sort desc')->count();
			
			$k=1;
			if(is_array($class)){
			foreach($class as $key=>$vo){
				//主菜单

				$data.='{"name":"'.$vo['title'].'",';
				$c=$this->model->table('diymen_class')->where(array('token'=>$this->token,'pid'=>$vo['id']))->limit(5)->order('sort desc')->select();
				$count=$this->model->table('diymen_class')->where(array('token'=>$this->token,'pid'=>$vo['id']))->limit(5)->order('sort desc')->count();
				//子菜单
				$vo['url']=str_replace(array('&amp;'),array('&'),$vo['url']);
				if($c!=false){
					$data.='"sub_button":[';
				}else{
					if(!$vo['url']){
						$data.='"type":"click","key":"'.$vo['keyword'].'"';
					}else {
						$data.='"type":"view","url":"'.$vo['url'].'"';
					}
				}
				$i=1;
				if(is_array($c)) {
				foreach($c as $voo){
					$voo['url']=str_replace(array('&amp;'),array('&'),$voo['url']);
					if($i==$count){
						if($voo['url']){
							$data.='{"type":"view","name":"'.$voo['title'].'","url":"'.$voo['url'].'"}';
						}else{
							$data.='{"type":"click","name":"'.$voo['title'].'","key":"'.$voo['keyword'].'"}';
						}
					}else{
						if($voo['url']){
							$data.='{"type":"view","name":"'.$voo['title'].'","url":"'.$voo['url'].'"},';
						}else{
							$data.='{"type":"click","name":"'.$voo['title'].'","key":"'.$voo['keyword'].'"},';
						}
					}
					$i++;
				}
				}
				if($c!=false){
					$data.=']';
				}

				if($k==$kcount){
					$data.='}';
				}else{
					$data.='},';
				}
				$k++;
			}
			}
			$data.=']}';

			file_get_contents('https://api.weixin.qq.com/cgi-bin/menu/delete?access_token='.$json->access_token);

			$url='https://api.weixin.qq.com/cgi-bin/menu/create?access_token='.$json->access_token;
			$rt=$this->api_notice_increment($url,$data);
			if($rt['rt']==false){
				$this->msg('操作失败,curl_error:'.$rt['errorno'],0);
			}else{
				$this->msg('操作成功',1);
			}
			exit;
		}else{
			$this->msg('非法操作',0);
		}
	}	
	
	function api_notice_increment($url, $data){
		$ch = curl_init();
		$header = "Accept-Charset: utf-8";
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
		//curl_setopt($curl, CURLOPT_HTTPHEADER, $header);
		curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; MSIE 5.01; Windows NT 5.0)');
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt($ch, CURLOPT_AUTOREFERER, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$tmpInfo = curl_exec($ch);
		
		$errorno=curl_errno($ch);
		if ($errorno) {
			return array('rt'=>false,'errorno'=>$errorno);
		}else{
			$js=json_decode($tmpInfo,1);
			if ($js['errcode']=='0'){
				return array('rt'=>true,'errorno'=>0);
			}else {
				$this->msg('发生错误：错误代码'.$js['errcode'].',微信返回错误信息：'.$js['errmsg'],1);
			}
		}
	}
	private function curlGet($url, $method = 'get', $data = ''){
    $ch = curl_init();
    $header = "Accept-Charset: utf-8";
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
   // curl_setopt($curl, CURLOPT_HTTPHEADER, $header);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; MSIE 5.01; Windows NT 5.0)');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($ch, CURLOPT_AUTOREFERER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $temp = curl_exec($ch);
	
    return $temp;
}
		
	
		
		
		
	
	
	
	
	
	 //评论列表
    public function person()
    {	$this->id=$aid=isset($_GET['id']) ? intval($_GET['id']) : 0;
        $url = __URL__ . '/person/id-'.$aid.'page-{page}'; //分页基准网址
        $listRows = 10;
        $page = new Page();
        $cur_page = $page->getCurPage($url);
        $limit_start = ($cur_page - 1) * $listRows;
        $limit = $limit_start . ',' . $listRows;
		
		
		$where=' fid ='.$aid;
		
        
        $count=model('comment')->count($where);
        $this->assign('page', $this->page($url, $count, $listRows));
		
        $this->list=model('comment')->model_list($limit,$where);
        $this->subject=model('diyfield')->field_list_data(2);
        $this->grade=model('diyfield')->field_list_data(1);
		
		
		if(isset($_GET['download'])){
				$list=model('comment')->get_list($where);
				foreach($list as $k=>$v){
					
					$list[$k]['name']=model('comment')->info_user($v['uid']);
					
					}
					
				
		header("Content-Type: text/html; charset=utf-8");
		header("Content-type:application/vnd.ms-execl");
		header("Content-Disposition:filename=employee.xls");
		echo iconv('utf-8','gbk','评论')."\t";
		echo iconv('utf-8','gbk','评论人')."\t";
		
		echo iconv('utf-8','gbk','时间')."\n";
		foreach($list as $k=>$v){
		echo iconv('utf-8','gbk',$v['message'])."\t";
		echo iconv('utf-8','gbk',$v['name'])."\t";
		
		echo iconv('utf-8','gbk',date("Y/m/d H:i",$v['time']))."\n";
		
		}
			die;
			}
		
        $this->show();
    }
	
	
    //评论添加
    public function add()
    {
        $this->action_name='添加';
        $this->action='add';
      $this->subject=model('diyfield')->field_list_data(2);
		$this->grade=model('diyfield')->field_list_data(1);

        $this->display('comment/info');
    }
  //评论保存
    public function add_save()
    {
        

        model('comment')->save($_POST);
       
        /*hook end*/
        $this->msg('评论添加成功！',1);
    }

     //评论添加
    public function edit()
    {   $this->id=$id=isset($_GET['id']) ? intval($_GET['id']) : 0;
		 $this->fid=$fid=isset($_GET['fid']) ? intval($_GET['fid']) : 0;
		 if(!$id||!$fid){
			 $this->error('不可操作');
			 }
        $this->action_name='转移';
        $this->action='edit';
     
        $this->info=model('comment')->info($id);
		$article=model('content')->info($fid);
		$this->list=model('content')->getlist($article['aids']);
        $this->display('comment/info');
    }
  //评论保存
    public function edit_save()
    {
        

     echo    model('comment')->edit_save($_POST);die;
       
        /*hook end*/
        $this->msg('评论编辑成功！',1);
    }
	

	//评论删除
    /*public function del()
    {
        $this->alert_str($_POST['id'],'int',true);
       
        $class_status=model('comment')->del($_POST['id']);
        
        $this->msg('页面删除成功！',1);
    }*/

        //评论审核
    public function examine()
    {
        $this->alert_str($_POST['id'],'int',true);
       
        $class_status=model('comment')->examine($_POST['id']);
        
        $this->msg('评论审核成功！',1);
    }
	
	    //批量删除
    public function moredeldel()
    {
        $data = $_POST['id'];
        foreach ($data as $k => $v) {
            $class_status=model('comment')->del($data[$k]);
        }
        $this->msg('页面删除成功！',1);
    }
	
	

	public function diytpl()
	{	
		$uid=intval($_SESSION[$this->config['SPOT'].'_user']);
		$list=$this->model->table('diytpl')->where(array('uid'=>$uid))->select();
		$this->assign('list',$list);
		
		$this->display();
		
		}
	public function diytpl_edit()
	{	error_reporting(0);
		if(!$_GET['cid']){
			$thiscate=$this->model->table('category')->where(array('show'=>1))->find();
			$cid=$thiscate['cid'];
			
		}else{
			$cid=intval($_GET['cid']);
		}
		$tpldata['aid']=array();
		$this->assign('cateid',$cid);
		$id=intval($_GET['id']);
		$tpldata=$this->model->table('diytpl')->where(array('id'=>$id))->find();
		
		$tpldata['aid']=unserialize($tpldata['aid']);
		$this->assign('info',$tpldata);
		 $user=model('user')->current_user();
		 $where['cid']=$cid;
		if($user['cid'])	 $where['sid']=$user['cid'];
		
		
		$list=$this->model->table('content')->where($where)->select();
		
		$this->assign('list',$list);
		$this->display();
		
		}
		public function diytpl_del()
	{	$id=intval($_GET['id']);
	
		$this->model->table('diytpl')->where(array('id'=>$id))->delete();
		
		
		$this->msg('删除成功！',1);
		}	
	public function diytpl_edit_save(){
		$_POST['aid']=serialize($_POST['aid']);
		$_POST['uid']=intval($_SESSION[$this->config['SPOT'].'_user']);
		
		
		if($_POST['id']){
			
			$add=model('wechat')->info_save('diytpl',$_POST);
		}else{
			
			$add=model('wechat')->insert('diytpl',$_POST);
			}
		if($add){
			$this->msg('保存成功！',1);
		}
		
		}	
		
		
	public function menu_add_diytpl_list(){
		
		$uid=intval($_SESSION[$this->config['SPOT'].'_user']);
		$list=$this->model->table('diytpl')->where(array('uid'=>$uid))->select();
		$this->assign('list',$list);
	
		$this->display();
		
	}	



}