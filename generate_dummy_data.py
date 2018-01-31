from faker import Faker
import bcrypt
import random

fake = Faker()

def pw_hash(password):
	salt = bcrypt.gensalt(rounds=10);
	hashed = bcrypt.hashpw(password.encode('utf8'), salt)
	return hashed.decode('utf8')

def create_user(name, hash, seed, date):
	return "insert into users values (NULL, '{0}', '{1}', '{2}', '{3}');".format(name, hash, seed, date)

def create_project(user_id, title, short_description, description, fund_goal, amount_pledged, date_added, deadline):
	return "insert into projects values (NULL, '{0}', '{1}', '{2}', '{3}', 'scriptPubKey', '{4}', '{5}', '{6}', '{7}');".format(user_id, title, short_description, description, fund_goal, amount_pledged, date_added, deadline);

def create_project_update(project_id, update_description, update_time):
	return "insert into project_updates values (NULL, '{0}', '{1}', '{2}');".format(project_id, update_description, update_time)

def create_project_comment(project_id, user_id, comment, comment_time):
	return "insert into project_comments values (NULL, '{0}', '{1}', '{2}', '{3}');".format(project_id, user_id, comment, comment_time)

def main():
	# users = [ ("user{0}".format(index),)for index in range(10) ]
	users = []
	projects = []
	project_updates = []
	project_comments = []

	num_users = 20
	for user in range(num_users):
		name = fake.name()
		hash = pw_hash("password")
		seed = fake.sha1()
		date = fake.date_time_this_year().strftime('%Y-%m-%d %H:%M:%S')

		db_user = create_user(name, hash, seed, date)
		users.append(db_user)

	num_projects_per_user = 5
	# projects
	for user_id in range(1, num_users + 1):
		for project_no in range(5):
			title = fake.company()
			short_description = fake.text(max_nb_chars=80)
			description = fake.text(max_nb_chars=500)
			fund_goal = random.random() * 1000
			amount_pledged = random.random() * fund_goal
			deadline = fake.date_time_this_year()
			date_added = fake.date_time(end_datetime=deadline).strftime('%Y-%m-%d %H:%M:%S')
			deadline_str = deadline.strftime('%Y-%m-%d %H:%M:%S')
			project = create_project(user_id, title, short_description, description, fund_goal, amount_pledged, date_added, deadline_str)
			projects.append(project)

	for project_id in range(1, num_users * num_projects_per_user):
		num_updates = int(random.random() * 3) 
		num_comments = int(random.random() * 5) 

		for update_no in range(1, num_updates + 1):
			update_description = fake.text(max_nb_chars=500)
			update_time = fake.date_time_this_year().strftime('%Y-%m-%d %H:%M:%S')
			project_update = create_project_update(project_id, update_description, update_time)
			project_updates.append(project_update)

		for comment_no in range(1, num_updates + 1):
			user_id = int(num_users * random.random()) + 1
			comment = fake.text(max_nb_chars=500)
			comment_time = fake.date_time_this_year().strftime('%Y-%m-%d %H:%M:%S')
			project_comment = create_project_comment(project_id, user_id, comment, comment_time)
			project_comments.append(project_comment)


	for table in [users, projects, project_updates, project_comments]:
		for row in table:
			print(row)

if __name__ == "__main__":
	main()