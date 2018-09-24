-- SET FOREIGN_KEY_CHECKS=0;

drop table if exists users;
create table users (
	user_id int not null auto_increment,
	username varchar(30) not null,
	password_hash char(60) not null, 
	xpub_key varchar(200) not null, -- blob
	date_joined datetime not null,
	primary key (user_id),
	unique (username)
);

drop table if exists hd_indices;
create table hd_indices (
	index_id int not null auto_increment,
	user_id int not null,
	change_index int unsigned not null,
	external_index int unsigned not null,	
	primary key (index_id),
	foreign key (user_id) references users(user_id) on delete cascade
);

drop table if exists projects; 
create table projects (
	project_id int not null auto_increment,
	user_id int not null,
	title varchar(50) not null, 
	short_description varchar(80) default null, 
	description text default null, 
	address varchar(40) not null,
	fund_goal bigint not null, 
	amount_pledged bigint default 0,
	date_added datetime not null,
	deadline datetime,
	token char(64) not null,
	primary key (project_id),
	foreign key (user_id) references users(user_id) on delete cascade
);

drop table if exists project_updates; 
create table project_updates (
	project_update_id int not null auto_increment,
	project_id int not null,
	update_description text not null,
	update_time datetime,
	primary key (project_update_id),
	foreign key (project_id) references projects(project_id) on delete cascade
);

drop table if exists project_comments; 
create table project_comments (
	project_comment_id int not null auto_increment,
	project_id int not null,
	user_id int not null,	
	comment text not null,
	comment_time datetime,
	primary key (project_comment_id),
	foreign key (project_id) references projects(project_id) on delete cascade,
	foreign key (user_id) references users(user_id) 
);

drop table if exists pledge_inputs;
create table pledge_inputs (
	input_id int not null auto_increment,
	pledge_id int not null,
	prevTxId char(128) not null, -- unique 
	outputIndex int unsigned not null, 
	sequenceNumber int unsigned not null, 
	script text not null,
	output_satoshis bigint not null, 
	output_script text not null,
	primary key (input_id),
	foreign key (pledge_id) references pledges(pledge_id) on delete cascade
);

drop table if exists pledges;
create table pledges (
	pledge_id int not null auto_increment,
	user_id int not null, 
	project_id int not null, 
	amount bigint unsigned not null,
	pledge_time datetime not null,
	refund_tx text,
	primary key (pledge_id),
	foreign key (user_id) references users(user_id) on delete cascade,
	foreign key (project_id) references projects(project_id) on delete cascade
);

-- SET FOREIGN_KEY_CHECKS=1;
