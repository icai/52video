<?php
class commentMod extends commonMod {

	public function __construct()
    {
        parent::__construct();
    }

	public function index() {
      
		$this->display();
	}

	
	public function data(){
	
		 $_POST['time']=time();
		 $_POST['uid']=$_SESSION['uid'];
		 if($_POST['uid'] > 0){
			 $_POST['nickname']=$_SESSION['nickname'];
			 model('comment')->save($_POST);
			$this->msg('添加成功！',1);
		 }else{
			$this->msg('请先登录！',0); 
		}	
	}
	
	public function reply_add(){
		$data['time']=time();
		$data['uid']=$_SESSION['uid'];
		$data['fid']=$_POST['id'];
		$data['pid']=$_POST['pid'];
		$data['toname']=$_POST['toname'];
		$data['type']="content";
		$data['message']=$_POST['mes'];
		$data['nickname']=$_SESSION['nickname'];
		if($data['uid'] > 0){
			$id=model('comment')->save($data);
			$this->msg($id,1);
		 }else{
			$this->msg('请先登录！',0); 
		}	
		
	}
	
	public function commentlist(){
		$page=intval($_POST['page']);
		$listrows=3;
		$limit=($page-1)*$listrows.','.$listrows;
		$comment=model('comment')->comment_list($_POST['fid'],$_POST['type'],$limit);
		$count=model('comment')->comment_id_count($_POST['fid']);
		
		if($comment){
	        if(is_array($comment)){
				foreach($comment as $k=>$v){
					if(!$v['nickname']) {
						$v['nickname'] = "匿名网友";
					}
					$html.='<li class="clearfix">
		          	<div class="txPic left"><img src="'.model('user')->picture($v['uid']).'" /></div>
		              <div class="bjListCon">
		              	<p class="biaoti">'.$v['nickname'].'</p>
		                  <p class="jianjie">'.$v['message'].'</p>
		                  <p class="time">'.date('Y-m-d H:i:s',$v['time']).'</p>
		              </div>
		          </li>';
				}
				$return['status']=1;
				$return['html']=$html;
				$return['count']=$count;
			}
		}else{
			
		$return['flag']=0;
			}
		echo json_encode($return);
		} 	

}