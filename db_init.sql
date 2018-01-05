-- https://www.cyberciti.biz/faq/howto-install-mysql-on-ubuntu-linux-16-04/
drop table users;
create table users (
	user_id int not null auto_increment,
	username varchar(30) not null,
	password_hash varchar(255) not null, --binary(60))
	salt varchar(255) not null,
	encrypted_seed varchar(255) not null, -- blob
	date_joined datetime not null,
	primary key (user_id),
	unique (username)
);

drop table projects; -- currency?, rewards?
create table projects (
	project_id int not null auto_increment,
	title varchar(50) not null, 
	short_description varchar(80) default null, 
	description varchar(500) default null, -- blob
	scriptPubKey varchar(200) not null, -- blob , unique
	fund_goal int not null, -- float
	amount_pledged int default 0,
	date_added datetime not null,
	deadline datetime,
	primary key (project_id)
);

drop table project_updates; -- currency?
create table project_updates (
	project_update_id int not null auto_increment,
	project_id int not null,
	update_description varchar(500) not null,
	update_time datetime,
	primary key (project_update_id),
	foreign key (project_id) references projects(project_id)
);

drop table project_comments; 
create table project_comments (
	project_comment_id int not null auto_increment,
	project_id int not null,
	comment varchar(500) not null,
	comment_time datetime,
	primary key (project_comment_id),
	foreign key (project_id) references projects(project_id)
);

drop table pledge_inputs;
create table pledge_inputs (
	input_id int not null auto_increment,
	txid varchar(100) not null, -- unique 
	vout small int not null, 
	signature varchar(100) not null, --blob
	primary key (input_id)
);

drop table pledges;
create table pledges (
	pledge_id int not null auto_increment,
	user_id int not null, 
	project_id int not null, 
	input_id int not null, 
	amount int not null,
	pledge_time datetime not null,
	primary key (pledge_id)
	foreign key (user_id) references users(users_id)
	foreign key (project_id) references projects(project_id)
	foreign key (input_id) references pledge_inputs(input_id)
);