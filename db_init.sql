-- https://www.cyberciti.biz/faq/howto-install-mysql-on-ubuntu-linux-16-04/
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

drop table if exists mnemonics;
create table mnemonics (
	mnemonic_id int not null auto_increment,
	user_id int not null,
	mnemonic varchar(100) not null,
	primary key (mnemonic_id),
	foreign key (user_id) references users(user_id) on delete cascade
);

drop table if exists hd_indices;
create table hd_indices (
	index_id int not null auto_increment,
	user_id int not null,
	change_index int not null,
	external_index int not null,	
	primary key (index_id),
	foreign key (user_id) references users(user_id) on delete cascade
);

drop table if exists projects; -- currency?, rewards?, media / images
create table projects (
	project_id int not null auto_increment,
	user_id int not null,
	title varchar(50) not null, 
	short_description varchar(80) default null, 
	description varchar(500) default null, -- blob
	scriptPubKey varchar(200) not null, -- blob , unique
	fund_goal bigint not null, -- float
	amount_pledged bigint default 0,
	date_added datetime not null,
	deadline datetime,
	primary key (project_id),
	foreign key (user_id) references users(user_id) on delete cascade
);

drop table if exists project_updates; -- currency?
create table project_updates (
	project_update_id int not null auto_increment,
	project_id int not null,
	update_description varchar(500) not null,
	update_time datetime,
	primary key (project_update_id),
	foreign key (project_id) references projects(project_id) on delete cascade
);

-- dont delete comment if user deletes acc? 
drop table if exists project_comments; 
create table project_comments (
	project_comment_id int not null auto_increment,
	project_id int not null,
	user_id int not null,	
	comment varchar(500) not null,
	comment_time datetime,
	primary key (project_comment_id),
	foreign key (project_id) references projects(project_id) on delete cascade,
	foreign key (user_id) references users(user_id) 
);

drop table if exists pledge_inputs;
create table pledge_inputs (
	input_id int not null auto_increment,
	txid varchar(100) not null, -- unique 
	vout smallint not null, 
	signature varchar(500) not null, 
	primary key (input_id)
);

drop table if exists pledges;
create table pledges (
	pledge_id int not null auto_increment,
	user_id int not null, 
	project_id int not null, 
	input_id int not null, 
	amount bigint not null,
	pledge_time datetime not null,
	primary key (pledge_id),
	foreign key (user_id) references users(user_id) on delete cascade,
	foreign key (project_id) references projects(project_id) on delete cascade,
	foreign key (input_id) references pledge_inputs(input_id) on delete cascade
);

-- SET FOREIGN_KEY_CHECKS=1;
